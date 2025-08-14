/**
 * # Usage
 * Create an instance using `new EventBus()`
 *
 * __PKG_INFO__
 */
export class EventBus {
  /**
   * Map of all registered eventName and set of eventConfigs.
   */
  private readonly eventMap: Map<string, Set<EventConfig>>;

  constructor() {
    this.eventMap = new Map();
  }

  /**
   * Check if a function is an arrow function.
   * - if `fn` is not a function, return `null`
   * - else returns whether `fn` is an arrow function
   */
  private isArrowFunction(fn: any): boolean | null {
    if (typeof fn !== 'function') {
      return null;
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
      throw new TypeError('eventName must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }
    if (typeof capacity !== 'number' && typeof capacity !== 'undefined') {
      throw new TypeError('capacity must be a number or undefined');
    }

    // Prevent eventNames with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (eventName.match(/[^.]\*/g)) {
      throw new TypeError(`eventName cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`);
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
      // ! `This handler function is already existed under the event '${eventName}', it will not be registered again and only the capacity will be updated`
      existConfig.capacity = capacity;
    } else {
      configs.add({
        name: eventName,
        handler,
        capacity,
        isArrowFunctionHandler: !!this.isArrowFunction(handler),
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
      throw new TypeError('eventName must be a string');
    }
    if (typeof handler !== 'function' && typeof handler !== 'undefined') {
      throw new TypeError('handler must be a function or undefined');
    }

    const configs = this.getExactConfigs(eventName);
    if (configs === undefined) {
      throw new TypeError(`Event '${eventName}' has no matched config sets.`);
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
      throw new TypeError('eventName must be a string');
    }

    // 触发用的事件名称不能带星号
    // eventName cannot include *.
    if (eventName.includes('*')) {
      throw new TypeError('eventName used in emit function cannot include *');
    }

    const call = thisArg
      ? (config: EventConfig) => {
          if (config.isArrowFunctionHandler) {
            // '使用箭头函数时指定thisArgs可能无法达到预期效果！Appoint thisArg while using arrow function might not meet your expectaions!'
          }
          config.handler.call(thisArg, ...args);
        }
      : (config: EventConfig) => config.handler(...args);

    const configSets: Set<EventConfig>[] = this.getConfigs(eventName);

    for (const configs of configSets) {
      configs.forEach((c, v, s) => {
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
}
