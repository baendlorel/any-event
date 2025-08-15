import { singletonify } from 'singleton-pattern';

const NotProvided = Symbol('NotProvided');

/**
 * ## Usage
 * Create an instance using `new EventBus()`
 *
 * __PKG_INFO__
 */
export class EventBus {
  static get instance() {
    const EB = singletonify(EventBus);
    return new EB();
  }

  /**
   * Map of all registered eventName and set of eventConfigs.
   */
  private readonly eventMap: Map<string, EventConfig[]>;

  constructor() {
    this.eventMap = new Map();
  }

  /**
   * Using wildcard to match all config sets of an eventName.
   * @param eventName
   */
  private getConfigs(eventName: string): EventConfig[][] {
    const matchedConfigs: EventConfig[][] = [];
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
   * Get the exact configs of an eventName.
   * @param eventName
   */
  private getExactConfigs(eventName: string): EventConfig[] | undefined {
    return this.eventMap.get(eventName);
  }

  private normalizeCapacity(capacity: number | typeof NotProvided): number {
    if (capacity === NotProvided) {
      return Infinity;
    }
    if (Number.isSafeInteger(capacity) && capacity > 0) {
      return capacity;
    }
    throw new TypeError('capacity must be an integer or omitted');
  }

  /**
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName name of the event
   * @param handler
   * @param capacity trigger limit
   */
  private register(eventName: string, handler: Fn, capacity: number = NotProvided as any) {
    // paramter check
    if (typeof eventName !== 'string') {
      throw new TypeError('eventName must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('handler must be a function');
    }
    // Prevent eventNames with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (eventName.match(/[^.]\*/g)) {
      throw new TypeError(`eventName cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`);
    }

    capacity = this.normalizeCapacity(capacity);

    const configs = this.eventMap.get(eventName);
    const entry = {
      name: eventName,
      handler,
      capacity,
    };

    if (configs) {
      configs.push(entry);
    } else {
      this.eventMap.set(eventName, [entry]);
    }
  }

  /**
   * Register an event. Do not use names with '*' not come after '.'.
   * @param eventName name of the event
   * @param handler will be called if matched
   * @param capacity trigger limit
   * @throws if `eventName` has '*' not come after '.'.
   */
  public on(eventName: string, handler: Fn, capacity?: number) {
    this.register(eventName, handler, capacity);
  }

  /**
   * Register an event that can only be triggered once.
   * @param eventName name of the event
   * @param handler will be called if matched
   * @throws if `eventName` has '*' not come after '.'.
   */
  public once(eventName: string, handler: Fn) {
    this.register(eventName, handler, 1);
  }

  /**
   * Remove the handler of an eventName, or all handlers of an eventName if handler is omitted
   * @param eventName must be exact
   * @param handler optional, if omitted, all handlers of this eventName will be removed
   * @returns `false` if deleted nothing, `true` otherwise.
   */
  public off(eventName: string, handler: Fn = NotProvided as any): boolean {
    // paramter check
    if (typeof eventName !== 'string') {
      throw new TypeError('eventName must be a string');
    }
    if (typeof handler !== 'function' && handler !== NotProvided) {
      throw new TypeError('handler must be a function or omitted');
    }

    const configs = this.getExactConfigs(eventName);
    if (configs === undefined) {
      return false;
    }

    if (!handler) {
      this.eventMap.delete(eventName);
      return true;
    }

    // The register function has garuanteed that there will be no duplicated name-handler tuple.
    for (let i = 0; i < configs.length; i++) {
      if (configs[i].handler === handler) {
        configs[i] = null as any;
      }
    }

    const deleted = configs.filter((c) => c === null);
    if (deleted.length === configs.length) {
      return false;
    }

    if (deleted.length === 0) {
      this.eventMap.delete(eventName);
      return true;
    }

    this.eventMap.set(eventName, deleted);
    return true;
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
    // paramter check
    if (typeof eventName !== 'string') {
      throw new TypeError('eventName must be a string');
    }

    // eventName cannot include *.
    if (eventName.includes('*')) {
      throw new TypeError('eventName used in emit function cannot include *');
    }

    const configsArr: EventConfig[][] = this.getConfigs(eventName);
    for (const configs of configsArr) {
      configs.forEach((c, v, s) => {
        c.handler(...args);
        c.capacity--;
        if (c.capacity <= 0) {
          s.delete(c);
        }

        // if this event has no handler after deletion, delete it.
        if (s.length === 0) {
          this.eventMap.delete(c.name);
        }
      });
    }
  }
}
