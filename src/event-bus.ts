import { singletonify } from 'singleton-pattern';

const NotProvided = Symbol('NotProvided');

/**
 * ## Usage
 * Create an instance using `new EventBus()`
 *
 * __PKG_INFO__
 */
export class EventBus {
  /**
   * Returns a singleton instance of EventBus.
   * - empowered by npm package `singleton-pattern`
   * @see https://www.npmjs.com/package/singleton-patternc  (Yes, tbhis is my work too (づ｡◕‿‿◕｡)づ)
   */
  static get getInstance() {
    const EB = singletonify(EventBus);
    return new EB();
  }

  /**
   * Map of all registered evt and set of eventConfigs.
   */
  private readonly eventMap = new Map<string, EventConfig[]>();

  private readonly idListenerMap = new Map<number, Fn>();

  /**
   * Used to generate unique id for each event handler.
   */
  private id: number = 0;

  /**
   * Using wildcard to match all config sets of an evt.
   * @param evt
   */
  private getConfigs(evt: string): EventConfig[][] {
    const matchedConfigs: EventConfig[][] = [];
    for (const en of this.eventMap.keys()) {
      // evt is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        const match = evt.match(reg);

        // Avoid match only part of the name
        if (match && match[0] === evt) {
          // for of .keys() garuantees its existance
          const c = this.eventMap.get(en)!;
          matchedConfigs.push(c);
        }
      } else if (en === evt) {
        const c = this.eventMap.get(en)!;
        matchedConfigs.push(c);
      }
    }
    return matchedConfigs;
  }

  /**
   * Get the exact configs of an evt.
   * @param evt
   */
  private getExactConfigs(evt: string): EventConfig[] | undefined {
    return this.eventMap.get(evt);
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
   * @param evt name of the event
   * @param handler will be called if matched
   * @param capacity trigger limit
   * @returns an automically increased `id` of the registered handler
   */
  private register(evt: string, handler: Fn, capacity: number = NotProvided as any): number {
    // paramter check
    if (typeof evt !== 'string') {
      throw new TypeError(`'evt' must be a string`);
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`'handler' must be a function`);
    }
    // Prevent evts with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (evt.match(/[^.]\*/g)) {
      throw new TypeError(`evt cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`);
    }

    capacity = this.normalizeCapacity(capacity);

    const configs = this.eventMap.get(evt);

    const entry: EventConfig = {
      id: this.id++,
      handler,
      capacity,
    };

    if (configs) {
      configs.push(entry);
    } else {
      this.eventMap.set(evt, [entry]);
    }

    this.idListenerMap.set(entry.id, handler);
    return entry.id;
  }

  /**
   * Register an event. Do not use names with '*' not come after '.'.
   * @param evt name of the event
   * @param handler will be called if matched
   * @param capacity trigger limit
   * @throws if `evt` has '*' not come after '.'.
   */
  public on(evt: string, handler: Fn, capacity: number = NotProvided as any) {
    this.register(evt, handler, capacity);
  }

  /**
   * Register an event that can only be triggered once.
   * @param evt name of the event
   * @param handler will be called if matched
   * @throws if `evt` has '*' not come after '.'.
   */
  public once(evt: string, handler: Fn) {
    this.register(evt, handler, 1);
  }

  /**
   * Remove the handler of an evt, or all handlers of an evt if handler is omitted
   * @param evt must be exact
   * @returns `false` if deleted nothing, `true` otherwise.
   */
  public off(evt: string): boolean {
    // paramter check
    if (typeof evt !== 'string') {
      throw new TypeError(`'evt' must be a string`);
    }

    const configs = this.getExactConfigs(evt);
    if (configs === undefined) {
      return false;
    }

    return this.eventMap.delete(evt);
  }

  /**
   * `id` is returned by `on()` or `once()`
   * @param id the id of the listener
   */
  public removeListener(id: number): boolean {}

  /**
   * Clear all event-config maps
   */
  public clear() {
    this.eventMap.clear();
  }

  /**
   * Trigger an event by name. Not allow to use names includes '*'.
   * @param evt
   * @param args
   */
  public emit(evt: string, ...args: any) {
    // paramter check
    if (typeof evt !== 'string') {
      throw new TypeError('evt must be a string');
    }

    // evt cannot include *.
    if (evt.includes('*')) {
      return;
    }

    const configs = this.getExactConfigs(evt);

    if (!configs) {
      return [];
    }

    return configs.map((v) => {
      const result = v.handler(...args);
      v.capacity--;

      return {
        result,
        evt,
        expired: v.capacity <= 0,
      };
    });

    const configsArr: EventConfig[][] = this.getConfigs(evt);
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
