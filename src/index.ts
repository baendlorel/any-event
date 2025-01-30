/**
 * @name EventBus
 * @author Kasukabe Tsumugi <futami16237@gmail.com>
 * @license GPLv3
 */

/**
 * 事件处理器类型，普通的函数
 * Type of an event handler, it is just a normal function
 */
type EventHandler = (...args: any[]) => any;

/**
 * 事件配置，包含事件名称、处理函数handler、限制次数和handler是否为箭头函数
 * Event configuration, including name, handler function, trigger limit and whether handler is an arrow function
 */
type EventConfig = {
  /**
   * 事件名称。用来定位eventMap的键值
   * Event name. Used to locate the key of eventMap
   */
  name: string;

  /**
   * 事件处理函数，是否为箭头函数会影响thisArg的绑定
   * Event handler. Whether it is an arrow function will affect binding of thisArg.
   * @see 详见函数'emitWithThisArg'的注释
   * @see comment of function 'emitWithThisArg'
   */
  handler: EventHandler;

  /**
   * 触发次数，超过后次配置自动失效。undefined代表无限次
   * Trigger limit, the handler will expire when it reaches this limit. Undefined means it can be triggered infinite times.
   */
  capacity: number | undefined;

  /**
   * 记录handler是否为箭头函数。在注册的时候就直接判断好，方便后续使用
   * Handler is whether an arrow function or not. Check it during registeration for further use.
   */
  isArrowFunctionHandler: boolean;
};

/**
 * 事件总线类
 * Event Bus Class
 */
export default class EventBus {
  /**
   * 简易控制台，可以加日志
   * Logger with header '[TS-Event-Hub]'
   */
  private readonly logger: {
    on: boolean;
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    throw: (...args: any[]) => void;
  };

  /**
   * 保存了所有注册的事件名到事件配置集合的映射。
   * Map of all registered eventName and set of eventConfigs.
   */
  private readonly eventMap: Map<string, Set<EventConfig>>;

  constructor() {
    const header = '[TS-Event-Hub]';
    this.logger = {
      on: true,
      log: (...args: any[]) => this.logger.on && console.log(header, ...args),
      warn: (...args: any[]) => this.logger.on && console.warn(header, ...args),
      error: (...args: any[]) => this.logger.on && console.error(header, ...args),
      throw: (message: string) => {
        throw new Error(`${header} ${message}`);
      },
    };
    this.eventMap = new Map();
  }

  /**
   * 判断一个函数是否为箭头函数。
   * Check if a function is an arrow function.
   * @param fn
   * @returns
   */
  private isArrowFunction(fn: any) {
    if (typeof fn !== 'function') {
      this.logger.throw(
        '给的参数不是函数，无法判断是否为箭头函数。The parameter provided is not a function, cannot tell it is whether an arrow function'
      );
    }

    // 经过研究，使用new操作符是最为确定的判断方法，箭头函数无法new
    // 此处用proxy拦截构造函数，防止普通函数真的作为构造函数运行
    // After some research, using new operator to distinct arrow functions from normal functions is the best approach.
    // We use proxy here to avoid truely running the constructor normal function(while arrow function cannot be newed)
    try {
      const fp = new Proxy(fn, {
        construct(target, args) {
          return {};
        },
      });
      new fp();
      return false;
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message &&
        error.message.includes('is not a constructor')
      ) {
        return true;
      }
      this.logger.error('isArrowFunction', 'fn:', fn);
      this.logger.throw('isArrowFunction判断发生未知错误');
      return false;
    }
  }

  /**
   * 用通配符匹配获取一个事件名称对应的所有配置集合。
   * Using wildcard to match all config sets of an eventName.
   * @param eventName 事件名
   * @returns
   */
  private getConfigs(eventName: string): Set<EventConfig>[] {
    const matchedConfigs: Set<EventConfig>[] = [];
    for (const en of this.eventMap.keys()) {
      // 在注册时保证不会出现特殊情况
      // eventName is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        const match = eventName.match(reg);

        // 必须这样写来防止出现只匹配了前半段名字的情形
        // Avoid match only part of the name
        if (match && match[0] === eventName) {
          // 这是key值提取的，一定存在
          // for of .keys() garuantees its existance
          const c = this.eventMap.get(en)!;
          matchedConfigs.push(c);
        }
      } else if (en === eventName) {
        const c = this.eventMap.get(en)!;
        matchedConfigs.push(c);
      }
    }
    return matchedConfigs;
  }

  /**
   * 使用“===”来匹配事件名，查找事件配置集合
   * Using "===" to find event configs set
   * @param eventName 事件名
   * @returns
   */
  private getExactConfigs(eventName: string): Set<EventConfig> | undefined {
    return this.eventMap.get(eventName);
  }

  /**
   * 注册事件，事件名称不能使用前面不带.的*。
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName 事件名 name of the event
   * @param handler 处理函数 dealer function
   * @param capacity 触发上限 trigger limit
   */
  private register(eventName: string, handler: EventHandler, capacity?: number) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      this.logger.throw('eventName必须是string。eventName must be a string');
    }
    if (typeof handler !== 'function') {
      this.logger.throw('handler必须是function。handler must be a function');
    }
    if (typeof capacity !== 'number' && typeof capacity !== 'undefined') {
      this.logger.throw('capacity必须是number或undefined。capacity must be a number or undefined');
    }

    // 防止事件名称出现前面不带.的*。比如“*evt”和“evt*”
    // Prevent eventNames with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (eventName.match(/[^.]\*/g)) {
      this.logger.throw(
        `事件名称不允许使用前面不带.的*号，比如“*evt”和“evt*”。eventName cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`
      );
    }

    let configs: Set<EventConfig> | undefined = this.eventMap.get(eventName);

    if (configs === undefined) {
      configs = new Set();
      this.eventMap.set(eventName, configs);
    }

    // 判断要绑定的函数是否已经在这个事件下存在，存在就warn
    // See if the same name-handler tuple is already existed, log warning message if so.
    let existConfig: EventConfig | undefined = undefined;

    for (const c of configs.values()) {
      if (c.handler === handler) {
        existConfig = c;
        break;
      }
    }

    if (existConfig !== undefined) {
      this.logger.warn(
        `这个事件名下已经有同一个函数了，将只更新执行次数而不重复注册。 This handler function is already existed under the event '${eventName}', it will not be registered again and only the capacity will be updated`
      );
      existConfig.capacity = capacity;
    } else {
      configs.add({
        name: eventName,
        handler,
        capacity,
        isArrowFunctionHandler: this.isArrowFunction(handler),
      });
    }
  }

  /**
   * 注册事件，事件名称不能使用前面不带.的*。
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName 事件名 name of the event
   * @param handler 处理函数 dealer function
   * @param capacity 触发上限 trigger limit
   */
  public on(eventName: string, handler: EventHandler, capacity?: number) {
    this.register(eventName, handler, capacity);
  }

  /**
   * 注册只触发1次的事件，事件名称不能使用前面不带.的*。
   * Register an event that can only be triggered once. Do not use names with '*' not come after '.'.
   * @param eventName 事件名 name of the event
   * @param handler 处理函数 dealer function
   */
  public once(eventName: string, handler: EventHandler) {
    this.register(eventName, handler, 1);
  }

  /**
   * 需要注意，此处的eventName必须精确，和注册时的一样，不会进行通配。例如注册了'evt.*'的话，必须还使用'evt.*'才能注销它，用'evt.a'是不行的
   * Note that we must use the precise eventName as it was registered. Like we registered 'evt.*', and use 'evt.a' will not turn it off.
   * @param eventName
   * @param handler
   * @returns
   */
  public off(eventName: string, handler?: EventHandler) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      this.logger.throw('eventName必须是string。eventName must be a string');
    }
    if (typeof handler !== 'function' && typeof handler !== 'undefined') {
      this.logger.throw(
        'handler必须是function或undefined。handler must be a function or undefined'
      );
    }

    const configs = this.getExactConfigs(eventName);
    if (configs === undefined) {
      this.logger.warn(
        `事件名'${eventName}'没有匹配的事件集合。Event '${eventName}' has no matched config sets.`
      );
      return;
    }

    if (handler) {
      // 在注册事件时此处已经保证了不会有重复的name-handler
      // The register function has garuanteed that there will be no duplicated name-handler tuple.
      for (const c of configs.values()) {
        if (c.handler === handler) {
          configs.delete(c);
          break;
        }
      }

      // 如果删除事件后handler数量为0，则删除该事件
      // if this event has no handler after deletion, delete it.
      if (configs.size === 0) {
        this.eventMap.delete(eventName);
      }
    } else {
      this.eventMap.delete(eventName);
    }
  }

  /**
   * 清除事件配置映射
   * Clear all event-config maps
   */
  public clear() {
    this.logger.log(
      `清空所有事件，共${this.eventMap.size}个。Clear all ${this.eventMap.size} events`
    );
    this.eventMap.clear();
  }

  /**
   * 触发事件，事件名不能带有*号。
   * Trigger an event by name. Not allow to use names includes '*'.
   * @param eventName
   * @param args
   */
  public emit(eventName: string, ...args: any) {
    this.emitWithThisArg(eventName, undefined, ...args);
  }

  /**
   * 触发事件，事件名不能带有*号。
   * 如果真的要改变this指向，那么不要使用箭头函数。
   * Trigger an event by name. Not allow to use names includes '*'.
   * If you want to change thisArg, do not use arrow functions.
   * @param eventName
   * @param thisArg
   * @param args
   */
  public emitWithThisArg(eventName: string, thisArg: any, ...args: any) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      this.logger.throw('eventName必须是string。eventName must be a string');
    }

    // 触发用的事件名称不能带星号
    // eventName cannot include *.
    if (eventName.includes('*')) {
      this.logger.throw(
        '触发用的eventName不能包含*。eventName used in emit function cannot include *'
      );
    }

    const call = thisArg
      ? (config: EventConfig) => {
          if (config.isArrowFunctionHandler) {
            this.logger.warn(
              '使用箭头函数时指定thisArgs可能无法达到预期效果！Appoint thisArg while using arrow function might not meet your expectaions!'
            );
          }
          config.handler.call(thisArg, ...args);
        }
      : (config: EventConfig) => config.handler(...args);

    const configSets: Set<EventConfig>[] = this.getConfigs(eventName);

    if (configSets.length === 0) {
      this.logger.warn(
        `事件名'${eventName}'没有匹配的事件集合。Event '${eventName}' has no matched config sets.`
      );
    }

    for (const configs of configSets) {
      configs.forEach((c, v, s) => {
        this.logger.log(
          `以${eventName}触发了${c.name}。${eventName} triggered ${c.name}.`,
          ...args
        );
        call(c);
        if (c.capacity !== undefined) {
          c.capacity--;
          if (c.capacity <= 0) {
            s.delete(c);
          }
        }

        // 如果删除事件后handler数量为0，则删除该事件
        // if this event has no handler after deletion, delete it.
        if (s.size === 0) {
          this.eventMap.delete(c.name);
        }
      });
    }
  }

  /**
   * 开启控制台日志
   */
  public turnOnLog() {
    this.logger.on = true;
  }

  /**
   * 关闭控制台日志
   */
  public turnOffLog() {
    this.logger.on = false;
  }

  /**
   * 在控制台打印整个eventMap，用来查看所有事件和其配置。
   * Log eventMap in console to see all the event configs.
   * @param forced 为真则在关闭日志的情况下也可以打印。 If true, it can log even if the log is closed.
   */
  public logEventMaps(forced?: boolean) {
    if (forced) {
      console.log(
        '[TS-Event-Hub]',
        `所有事件映射展示如下。All events lies below \n`,
        this.eventMap
      );
    } else {
      this.logger.log(`所有事件映射展示如下。All events lies below \n`, this.eventMap);
    }
  }
}
