import { singletonify } from 'singleton-pattern';
import { expect, expectEmitEventName, expectEventName, isSafeInteger } from './common.js';

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
   * Map of id to event identifier
   */
  private readonly idMap = new Map<Id, EventIdentifier>();

  /**
   * Used to generate unique id for each event listener.
   */
  private id: number = 0;

  private setEvent(identifier: EventIdentifier, configs: Map<Id, EventConfig>) {
    if (typeof identifier === 'string') {
      this.stringEvents.set(identifier, configs);
    } else {
      this.events.set(identifier, configs);
    }
  }

  private getEvent(identifier: EventIdentifier) {
    if (typeof identifier === 'string') {
      return this.stringEvents.get(identifier);
    } else {
      return this.events.get(identifier);
    }
  }

  private deleteEvent(identifier: EventIdentifier) {
    if (typeof identifier === 'string') {
      this.stringEvents.delete(identifier);
    } else {
      this.events.delete(identifier);
    }
  }

  /**
   * Using wildcard to match all config sets of an event.
   * @param identifier
   */
  private matchEvents(identifier: EventIdentifier): Map<number, EventConfig>[] {
    if (typeof identifier !== 'string') {
      const configs = this.events.get(identifier);
      return configs ? [configs] : [];
    }

    const matched: Map<number, EventConfig>[] = [];

    // Check exact match first
    const exactConfig = this.stringEvents.get(identifier);
    if (exactConfig) {
      matched.push(exactConfig);
    }

    // Check wildcard patterns
    for (const [pattern, configs] of this.stringEvents) {
      if (pattern === identifier) continue; // already handled above

      if (pattern.includes('*')) {
        let isMatch = false;

        if (pattern.endsWith('.**')) {
          // Multi-level wildcard: 'user.**' matches 'user.login', 'user.profile.update', etc.
          const prefix = pattern.slice(0, -3); // remove '.**'
          isMatch = identifier === prefix || identifier.startsWith(prefix + '.');
        } else if (pattern.endsWith('.*')) {
          // Single-level wildcard: 'user.*' matches 'user.login', 'user.logout', but not 'user.profile.update'
          const prefix = pattern.slice(0, -1); // remove '*'
          if (identifier.startsWith(prefix)) {
            const suffix = identifier.slice(prefix.length);
            isMatch = suffix.length > 0 && !suffix.includes('.');
          }
        } else if (pattern.includes('.*')) {
          // Mixed patterns: 'user.*.settings' matches 'user.admin.settings', 'user.guest.settings'
          const regex = pattern.replace(/\.\*\*/g, '(?:\\..*)?').replace(/\.\*/g, '\\.[^.]+');
          const regexPattern = new RegExp(`^${regex}$`);
          isMatch = regexPattern.test(identifier);
        }

        if (isMatch) {
          matched.push(configs);
        }
      }
    }

    return matched;
  }

  // #region Registeration

  private register(identifier: EventIdentifier, listener: Fn, capacity: number): number {
    const configs = this.getEvent(identifier);

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
      this.setEvent(identifier, newConfig);
    }

    this.idMap.set(newId, identifier);

    return newId;
  }

  /**
   * Register an event. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   * @param identifier name of the event
   * @param listener will be called if matched
   * @param capacity trigger limit, if omitted, it will be `Infinity`
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public on(listener: Fn): number;
  /**
   * Register an event. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   * @param identifier name of the event
   * @param listener will be called if matched
   * @param capacity trigger limit, if omitted, it will be `Infinity`
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public on(identifier: EventIdentifier, listener: Fn, capacity?: number): number;
  public on(...args: unknown[]): number {
    expect(args.length >= 1, 'Not enough arguments!');
    const [a, b, c] = args as [any, Fn, number];
    switch (args.length) {
      case 1:
        expect(typeof a === 'function', `'listener' must be a function`);
        return this.register(a, a, Infinity);
      case 2:
        expectEventName(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        return this.register(a, b, Infinity);
      default:
        expectEventName(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        expect(isSafeInteger(c) && c > 0, `'capacity' must be a positive integer`);
        return this.register(a, b, c);
    }
  }

  /**
   * Register an event that can only be triggered once. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   * @param identifier name of the event
   * @param listener will be called if matched
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public once(listener: Fn): number;
  /**
   * Register an event that can only be triggered once. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   * @param identifier name of the event
   * @param listener will be called if matched
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public once(identifier: EventIdentifier, listener: Fn): number;
  public once(...args: unknown[]): number {
    expect(args.length >= 1, 'Not enough arguments!');
    const [a, b] = args as [any, Fn];
    switch (args.length) {
      case 1:
        expect(typeof a === 'function', `'listener' must be a function`);
        return this.register(a, a, 1);
      default:
        expectEventName(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        return this.register(a, b, 1);
    }
  }

  /**
   * Remove all listeners of an event
   * @param identifier must be exact the same as registered
   * @returns the matched event identifiers
   */
  public off(identifier: EventIdentifier): boolean;
  public off(...args: [EventIdentifier]): boolean {
    expect(args.length >= 1, 'Not enough arguments!');
    const identifier = args[0];
    const map = this.getEvent(identifier);
    if (!map) {
      return false;
    }
    map.forEach((_, id) => this.idMap.delete(id));
    this.deleteEvent(identifier);
    return true;
  }

  /**
   * `id` is returned by `on()` or `once()`
   * @param id the id of the listener
   * @returns `false` if removed nothing
   */
  public removeListener(id: number): boolean {
    expect(typeof id === 'number', `'id' must be a number`);

    const identifier = this.idMap.get(id);
    if (identifier === undefined) {
      return false;
    }
    const idConfigMap = this.getEvent(identifier);
    if (idConfigMap === undefined) {
      return false;
    }

    const a = this.idMap.delete(id);
    const b = idConfigMap.delete(id);
    return a || b;
  }
  // #endregion

  /**
   * ! **Use with CAUTION!**
   *
   * Clear all event-config maps
   */
  public clear() {
    this.stringEvents.clear();
    this.idMap.clear();
  }

  /**
   * Trigger an event by name
   * @param identifier name of the event, it can be anything
   * @param args args will be passed to the listener like `listener(...args)`
   * @returns
   * - `null` if no matched listener is found
   * - `EmitResult` is an object takes 'id' as keys and 'result info' as values with `ids[]`(array) that records all included ids.
   * @throws invalid `identifier`
   */
  public emit(identifier: EventIdentifier, ...args: any): EmitResult | null;
  public emit(...args: any[]): EmitResult | null {
    expect(args.length >= 1, 'Not enough arguments!');

    const identifier = args.shift();
    expectEmitEventName(identifier);
    const maps = this.matchEvents(identifier);
    if (maps.length === 0) {
      return null;
    }

    const ids: number[] = [];
    const result: EmitResult = { ids };
    for (let i = 0; i < maps.length; i++) {
      maps[i].forEach((cfg, id) => {
        ids.push(id);
        result[id] = {
          result: cfg.listener(...args),
          identifier: this.idMap.get(id),
          rest: --cfg.capacity,
        };
        if (cfg.capacity <= 0) {
          maps[i].delete(id);
          this.idMap.delete(id);
        }
      });
    }

    return result.ids.length === 0 ? null : result;
  }
}
