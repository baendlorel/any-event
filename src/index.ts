/**
 * Type of an event handler, it is just a normal function
 */
type EventHandler = (...args: any[]) => any;

/**
 * Event configuration, including name, handler function, trigger limit and whether handler is an arrow function
 */
type EventConfig = {
  /**
   * Event name. Used to locate the key of eventMap
   */
  name: string;

  /**
   * Event handler. Whether it is an arrow function will affect binding of thisArg.
   * @see comment of function 'emitWithThisArg'
   */
  handler: EventHandler;

  /**
   * Trigger limit, the handler will expire when it reaches this limit. Undefined means it can be triggered infinite times.
   */
  capacity: number | undefined;

  /**
   * Handler is whether an arrow function or not. Check it during registeration for further use.
   */
  isArrowFunctionHandler: boolean;
};

/**
 * # Usage
 * Create an instance using `new EventBus()`
 *
 * __PKG_INFO__
 */
export class EventBus {
  /**
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
        'The parameter provided is not a function, cannot tell it is whether an arrow function'
      );
    }

    // After some research, using new operator to distinct arrow functions from normal functions is the best approach.
    // We use proxy here to avoid truely running the constructor normal function(while arrow function cannot be newed)
    try {
      const fp = new Proxy(fn, {
        construct: () => ({}),
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
      return false;
    }
  }

  /**
   * Using wildcard to match all config sets of an eventName.
   * @param eventName
   */
  private getConfigs(eventName: string): Set<EventConfig>[] {
    const matchedConfigs: Set<EventConfig>[] = [];
    for (const en of this.eventMap.keys()) {
      // eventName is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        const match = eventName.match(reg);

        // Avoid match only part of the name
        if (match && match[0] === eventName) {
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
   * Using "===" to find event configs set
   * @param eventName
   * @returns
   */
  private getExactConfigs(eventName: string): Set<EventConfig> | undefined {
    return this.eventMap.get(eventName);
  }

  /**
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName name of the event
   * @param handler
   * @param capacity trigger limit
   */
  private register(eventName: string, handler: EventHandler, capacity?: number) {
    // 参数检测
    // paramter check
    if (typeof eventName !== 'string') {
      this.logger.throw('eventName must be a string');
    }
    if (typeof handler !== 'function') {
      this.logger.throw('handler must be a function');
    }
    if (typeof capacity !== 'number' && typeof capacity !== 'undefined') {
      this.logger.throw('capacity must be a number or undefined');
    }

    // Prevent eventNames with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (eventName.match(/[^.]\*/g)) {
      this.logger.throw(`eventName cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`);
    }

    let configs: Set<EventConfig> | undefined = this.eventMap.get(eventName);

    if (configs === undefined) {
      configs = new Set();
      this.eventMap.set(eventName, configs);
    }

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
        `This handler function is already existed under the event '${eventName}', it will not be registered again and only the capacity will be updated`
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
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName name of the event
   * @param handler
   * @param capacity trigger limit
   */
  public on(eventName: string, handler: EventHandler, capacity?: number) {
    this.register(eventName, handler, capacity);
  }

  /**
   * Register an event that can only be triggered once. Do not use names with '*' not come after '.'.
   * @param eventName name of the event
   * @param handler
   */
  public once(eventName: string, handler: EventHandler) {
    this.register(eventName, handler, 1);
  }

  /**
   * Note that we must use the precise eventName as it was registered. Like we registered 'evt.*', and use 'evt.a' will not turn it off.
   * @param eventName
   * @param handler
   * @returns
   */
  public off(eventName: string, handler?: EventHandler) {
    // paramter check
    if (typeof eventName !== 'string') {
      this.logger.throw('eventName must be a string');
    }
    if (typeof handler !== 'function' && typeof handler !== 'undefined') {
      this.logger.throw('handler must be a function or undefined');
    }

    const configs = this.getExactConfigs(eventName);
    if (configs === undefined) {
      this.logger.warn(`Event '${eventName}' has no matched config sets.`);
      return;
    }

    if (handler) {
      // The register function has garuanteed that there will be no duplicated name-handler tuple.
      for (const c of configs.values()) {
        if (c.handler === handler) {
          configs.delete(c);
          break;
        }
      }

      // if this event has no handler after deletion, delete it.
      if (configs.size === 0) {
        this.eventMap.delete(eventName);
      }
    } else {
      this.eventMap.delete(eventName);
    }
  }

  /**
   * Clear all event-config maps
   */
  public clear() {
    this.logger.log(
      `清空所有事件，共${this.eventMap.size}个。Clear all ${this.eventMap.size} events`
    );
    this.eventMap.clear();
  }

  /**
   * Trigger an event by name. Not allow to use names includes '*'.
   * @param eventName
   * @param args
   */
  public emit(eventName: string, ...args: any) {
    this.emitWithThisArg(eventName, undefined, ...args);
  }

  /**
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

        // if this event has no handler after deletion, delete it.
        if (s.size === 0) {
          this.eventMap.delete(c.name);
        }
      });
    }
  }

  public turnOnLog() {
    this.logger.on = true;
  }

  public turnOffLog() {
    this.logger.on = false;
  }

  /**
   * Log eventMap in console to see all the event configs.
   * @param forced If true, it can log even if the log is closed.
   */
  public logEventMaps(forced?: boolean) {
    if (forced) {
      console.log('[TS-Event-Hub]', `All events lies below \n`, this.eventMap);
    } else {
      this.logger.log(`All events lies below \n`, this.eventMap);
    }
  }
}
