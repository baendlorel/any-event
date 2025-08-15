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
  private readonly stringEvents = new Map<string, Map<Id, EventConfig>>();
  private readonly numberSymbolEvents = new Map<number | symbol, Map<Id, EventConfig>>();

  private readonly idMap = new Map<Id, EventName>();

  /**
   * Used to generate unique id for each event listener.
   */
  private id: number = 0;

  /**
   * Using wildcard to match all config sets of an evt.
   * @param evt
   */
  private getConfigs(evt: EventName): EventConfig[][] {
    const matchedConfigs: EventConfig[][] = [];
    for (const en of this.stringEvents.keys()) {
      // evt is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        const match = evt.match(reg);

        // Avoid match only part of the name
        if (match && match[0] === evt) {
          // for of .keys() garuantees its existance
          const c = this.stringEvents.get(en)!;
          matchedConfigs.push(c);
        }
      } else if (en === evt) {
        const c = this.stringEvents.get(en)!;
        matchedConfigs.push(c);
      }
    }
    return matchedConfigs;
  }

  private setEvent(evt: EventName, configs: Map<Id, EventConfig>) {
    if (typeof evt === 'string') {
      this.stringEvents.set(evt, configs);
    } else {
      this.numberSymbolEvents.set(evt, configs);
    }
  }

  private getEvent(evt: EventName) {
    if (typeof evt === 'string') {
      return this.stringEvents.get(evt);
    } else {
      return this.numberSymbolEvents.get(evt);
    }
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
   * @param listener will be called if matched
   * @param capacity trigger limit
   * @returns an automically increased `id` of the registered listener
   */
  private register(evt: EventName, listener: Fn, capacity: number = NotProvided as any): number {
    // paramter check
    if (typeof evt !== 'string' && typeof evt !== 'number' && typeof evt !== 'symbol') {
      throw new TypeError(`'evt' must be a string/number/symbol`);
    }

    if (typeof listener !== 'function') {
      throw new TypeError(`'listener' must be a function`);
    }

    // Prevent evts with '*' not come after '.'. e.g. '*evt' and 'evt*'
    if (typeof evt === 'string' && evt.match(/[^.]\*/g)) {
      throw new TypeError(`evt cannot use '*' not come after '.'. e.g.'*evt' and 'evt*'`);
    }

    capacity = this.normalizeCapacity(capacity);
    const configs = this.getEvent(evt);

    const newId = this.id++;
    const entry: EventConfig = {
      listener,
      capacity,
    };

    if (configs) {
      configs.set(newId, entry);
    } else {
      const newConfig = new Map<Id, EventConfig>();
      newConfig.set(newId, entry);
      this.setEvent(evt, newConfig);
    }

    this.idMap.set(newId, evt);

    return newId;
  }

  /**
   * Register an event. Do not use names with '*' not come after '.'.
   * @param evt name of the event
   * @param listener will be called if matched
   * @param capacity trigger limit
   * @throws if `evt` has '*' not come after '.'.
   */
  public on(evt: EventName, listener: Fn, capacity: number = NotProvided as any) {
    return this.register(evt, listener, capacity);
  }

  /**
   * Register an event that can only be triggered once.
   * @param evt name of the event
   * @param listener will be called if matched
   * @throws if `evt` has '*' not come after '.'.
   */
  public once(evt: EventName, listener: Fn) {
    return this.register(evt, listener, 1);
  }

  /**
   * Remove the listener of an evt, or all listeners of an evt if listener is omitted
   * @param evt must be exact
   * @returns `false` if deleted nothing, `true` otherwise.
   */
  public off(evt: EventName): boolean {
    if (typeof evt === 'string') {
      const configs = this.stringEvents.get(evt);
      if (!configs) {
        return false;
      }
      configs.forEach((_, id) => this.idMap.delete(id));
      return true;
    }

    const configs = this.numberSymbolEvents.get(evt);
    if (!configs) {
      return false;
    }
    configs.forEach((_, id) => this.idMap.delete(id));
    return true;
  }

  /**
   * `id` is returned by `on()` or `once()`
   * @param id the id of the listener
   * @returns `false` if removed nothing
   */
  public removeListener(id: number): boolean {
    const evt = this.idMap.get(id);
    if (evt === undefined) {
      return false;
    }
    const idConfigMap = this.getEvent(evt);
    if (idConfigMap === undefined) {
      return false;
    }

    const a = this.idMap.delete(id);
    const b = idConfigMap.delete(id);
    return a || b;
  }

  /**
   * Clear all event-config maps
   */
  public clear() {
    this.stringEvents.clear();
    this.idMap.clear();
  }

  /**
   * Trigger an event by name. Not allow to use names includes '*'.
   * @param evt
   * @param args
   */
  public emit(evt: EventName, ...args: any): EmitResult[] | null {
    const configs = this.getEvent(evt);
    if (!configs) {
      return null;
    }

    const result: EmitResult[] = [];
    configs.forEach((cfg, id) => {
      result.push({
        result: cfg.listener(...args),
        id,
        evt,
        rest: --cfg.capacity,
      });
      if (cfg.capacity <= 0) {
        configs.delete(id);
        this.idMap.delete(id);
      }
    });

    return result;
  }
}
