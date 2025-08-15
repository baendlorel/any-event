import { singletonify } from 'singleton-pattern';
import { E, expect } from './common.js';

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
  static getInstance() {
    const EB = singletonify(EventBus);
    return new EB();
  }

  /**
   * Map of string named events
   */
  private readonly stringEvents = new Map<string, Map<Id, EventConfig>>();

  /**
   * Map of all other events
   */
  private readonly events = new Map<NonStringEventName, Map<Id, EventConfig>>();

  /**
   * Map of id to event name
   */
  private readonly idMap = new Map<Id, EventName>();

  /**
   * Used to generate unique id for each event listener.
   */
  private id: number = 0;

  private setEvent(event: EventName, configs: Map<Id, EventConfig>) {
    if (typeof event === 'string') {
      this.stringEvents.set(event, configs);
    } else {
      this.events.set(event, configs);
    }
  }

  private getEvent(event: EventName) {
    if (typeof event === 'string') {
      return this.stringEvents.get(event);
    } else {
      return this.events.get(event);
    }
  }

  /**
   * Using wildcard to match all config sets of an event.
   * @param event
   */
  private matchEvents(event: EventName): Map<number, EventConfig>[] {
    if (typeof event !== 'string') {
      const configs = this.events.get(event);
      return configs ? [configs] : [];
    }

    // todo 重写通配符
    const matched: Map<number, EventConfig>[] = [];
    for (const en of this.stringEvents.keys()) {
      // event is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        const match = event.match(reg);

        // Avoid match only part of the name
        if (match && match[0] === event) {
          // for of .keys() garuantees its existance
          const c = this.stringEvents.get(en)!;
          matched.push(c);
        }
      } else if (en === event) {
        const c = this.stringEvents.get(en)!;
        matched.push(c);
      }
    }
    return matched;
  }

  /**
   * Prevent events with '*' not come after '.'. e.g. '*event' and 'event*'
   * - only check string type event names
   * - allowed: user.*, order.*
   * - not allowed: *user, user*, us*er
   */
  private expectEventName(event: EventName) {
    if (typeof event === 'string' && event.match(/[^.]\*/g)) {
      throw new E(`'event' cannot use '*' not come after '.'. e.g.'*event' and 'event*'`);
    }
  }

  // #region Registeration

  private register(event: EventName, listener: Fn, capacity: number): number {
    const configs = this.getEvent(event);

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
      this.setEvent(event, newConfig);
    }

    this.idMap.set(newId, event);

    return newId;
  }

  /**
   * Register an event. **Anything** can be an event name, including the `listener`
   * @param listener will be called if matched
   * @returns an automically increased `id` of the registered listener
   * @throws if `event` has '*' not come after '.'.
   */
  public on(listener: Fn): number;
  /**
   * Register an event. **Anything** can be an event name
   * @param event name of the event
   * @param listener will be called if matched
   * @returns an automically increased `id` of the registered listener
   * @throws if `event` has '*' not come after '.'.
   */
  public on(event: EventName, listener: Fn): number;
  /**
   * Register an event. **Anything** can be an event name
   * @param event name of the event
   * @param listener will be called if matched
   * @param capacity trigger limit
   * @returns an automically increased `id` of the registered listener
   * @throws if `event` has '*' not come after '.'.
   */
  public on(event: EventName, listener: Fn, capacity: number): number;
  public on(...args: unknown[]): number {
    expect(args.length >= 1, 'Not enough arguments!');
    const [a, b, c] = args as [any, Fn, number];
    switch (args.length) {
      case 1:
        expect(typeof a === 'function', `'listener' must be a function`);
        return this.register(a, a, Infinity);
      case 2:
        this.expectEventName(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        return this.register(a, b, Infinity);
      default:
        this.expectEventName(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        expect(Number.isSafeInteger(c) && c > 0, `'capacity' must be a positive integer`);
        return this.register(a, b, c);
    }
  }

  /**
   * Register an event that can only be triggered once. **Anything** can be an event name, including the `listener`
   * @param listener will be called if matched
   * @returns an automically increased `id` of the registered listener
   * @throws if `event` has '*' not come after '.'.
   */
  public once(listener: Fn): number;
  /**
   * Register an event that can only be triggered once. **Anything** can be an event name
   * @param event name of the event
   * @param listener will be called if matched
   * @returns an automically increased `id` of the registered listener
   * @throws if `event` has '*' not come after '.'.
   */
  public once(event: EventName, listener: Fn): number;
  public once(...args: unknown[]): number {
    expect(args.length >= 1, 'Not enough arguments!');
    const [a, b, c] = args as [any, Fn, number];
    switch (args.length) {
      case 1:
        expect(typeof a === 'function', `'listener' must be a function`);
        return this.register(a, a, 1);
      default:
        expect(typeof b === 'function', `'listener' must be a function`);
        return this.register(a, b, 1);
    }
  }

  /**
   * Remove the listener of an event, or all listeners of an event if listener is omitted
   * @param event must be exact
   * @returns `false` if deleted nothing, `true` otherwise.
   */
  public off(event: EventName): void {
    const maps = this.matchEvents(event);
    const names = new Set<EventName>();
    for (let i = 0; i < maps.length; i++) {
      const map = maps[i];
      map.forEach((_, id) => {
        const name = this.idMap.get(id);
        names.add(name);
        this.idMap.delete(id);
      });
    }

    // delete both, no side effects
    names.forEach((name) => {
      this.events.delete(name);
      this.stringEvents.delete(name as string);
    });
  }

  /**
   * `id` is returned by `on()` or `once()`
   * @param id the id of the listener
   * @returns `false` if removed nothing
   */
  public removeListener(id: number): boolean {
    const event = this.idMap.get(id);
    if (event === undefined) {
      return false;
    }
    const idConfigMap = this.getEvent(event);
    if (idConfigMap === undefined) {
      return false;
    }

    const a = this.idMap.delete(id);
    const b = idConfigMap.delete(id);
    return a || b;
  }
  // #endregion

  /**
   * Clear all event-config maps
   */
  public clear() {
    this.stringEvents.clear();
    this.idMap.clear();
  }

  /**
   * Trigger an event by name
   * @param event name of the event, it can be anything
   * @param args args will be passed to the listener like `listener(...args)`
   * @returns
   * - `null` if no matched listener is found
   * - `EmitResult` is an object takes 'id' as keys and 'result info' as values with `ids[]`(array) that records all included ids.
   */
  public emit(event: EventName, ...args: any): EmitResult | null {
    const maps = this.matchEvents(event);
    if (!maps) {
      return null;
    }

    const ids: number[] = [];
    const result: EmitResult = { ids };
    for (let i = 0; i < maps.length; i++) {
      maps[i].forEach((cfg, id) => {
        ids.push(id);
        result[id] = {
          result: cfg.listener(...args),
          event: this.idMap.get(id),
          rest: --cfg.capacity,
        };
        if (cfg.capacity <= 0) {
          maps[i].delete(id);
          this.idMap.delete(id);
        }
      });
    }

    return result;
  }
}
