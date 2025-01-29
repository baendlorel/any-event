type EventHandler = (...args: any[]) => void;

type EventName = string;

type EventConfig = {
  name: EventName;
  handler: EventHandler;
  capacity: number | undefined;
  isArrowFunctionHandler: boolean;
};

export class EventBus {
  private readonly logger: {
    showLog: boolean;
    warn: Function;
    log: Function;
    error: Function;
    throw: Function;
  };

  private readonly eventMap: Map<EventName, Set<EventConfig>>;

  constructor() {
    const header = '[TS-Event-Hub]';
    this.logger = {
      showLog: true,
      log: (...args: any) => this.logger.showLog && console.log(header, ...args),
      warn: (...args: any) => this.logger.showLog && console.warn(header, ...args),
      error: (...args: any) => this.logger.showLog && console.error(header, ...args),
      throw: (message: string) => {
        throw new Error(`${header} ${message}`);
      },
    };
    this.eventMap = new Map();
  }

  private isArrowFunction(f: any) {
    if (typeof f !== 'function') {
      this.logger.throw(
        '给的参数不是函数，无法判断是否为箭头函数。The parameter provided is not a function, cannot tell it is whether an arrow function'
      );
    }

    // 经过研究，使用new操作符是最为确定的判断方法，箭头函数无法new
    // 此处用proxy拦截构造函数，防止普通函数真的运行
    // After some research, using new operator to distinct arrow functions from normal functions is the best approach.
    // We use proxy here to avoid truely running the normal function(while arrow function cannot be newed)
    try {
      const fp = new Proxy(f, {
        construct(target, args) {
          return {};
        },
      });
      new fp();
      return false;
    } catch (error) {
      return true;
    }
  }

  private getConfigs(eventName: EventName): Set<EventConfig>[] {
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

  private getExactConfigs(eventName: EventName): Set<EventConfig> | undefined {
    return this.eventMap.get(eventName);
  }

  private register(eventName: EventName, handler: EventHandler, capacity?: number) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      throw new Error('eventName必须是string。eventName must be a string');
    }
    if (typeof handler !== 'function') {
      throw new Error('handler必须是function。handler must be a function');
    }
    if (typeof capacity !== 'number' && typeof capacity !== 'undefined') {
      throw new Error('capacity必须是number或undefined。capacity must be a number or undefined');
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

  public on(eventName: EventName, handler: EventHandler, capacity?: number) {
    this.register(eventName, handler, capacity);
  }

  public once(eventName: EventName, handler: EventHandler) {
    this.register(eventName, handler, 1);
  }

  /**
   * 需要注意，此处的eventName必须精确，和注册时的一样，不会进行通配。例如注册了'evt.*'的话，必须还使用'evt.*'才能注销它，用'evt.a'是不行的
   * Note that we must use the precise eventName as it was registered. Like we registered 'evt.*', and use 'evt.a' will not turn it off.
   * @param eventName
   * @param handler
   * @returns
   */
  public off(eventName: EventName, handler?: EventHandler) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      throw new Error('eventName必须是string。eventName must be a string');
    }
    if (typeof handler !== 'function' && typeof handler !== 'undefined') {
      throw new Error('handler必须是function或undefined。handler must be a function or undefined');
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

  public clear() {
    this.logger.log(
      `清空所有事件，共${this.eventMap.size}个。Clear all ${this.eventMap.size} events`
    );
    this.eventMap.clear();
  }

  public emit(eventName: EventName, ...args: any) {
    this.emitWithThisArg(eventName, undefined, ...args);
  }

  /**
   * 如果真的要改变this指向，那么不要使用箭头函数
   * If you want to change thisArg, then do not use arrow functions.
   * @param eventName
   * @param thisArg
   * @param args
   */
  public emitWithThisArg(eventName: EventName, thisArg: any, ...args: any) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      throw new Error('eventName必须是string。eventName must be a string');
    }

    // 触发用的事件名称不能带星号
    // eventName cannot include *.
    if (eventName.includes('*')) {
      throw new Error(
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

  public turnOnLog() {
    this.logger.showLog = true;
  }

  public turnOffLog() {
    this.logger.showLog = false;
  }

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
