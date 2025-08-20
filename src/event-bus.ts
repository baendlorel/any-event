import { singletonify } from 'singleton-pattern';
import { isSafeInteger } from './common.js';
import { expect } from './expect.js';

const nameMap = new WeakMap<EventBus, string>();

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
   * @see https://www.npmjs.com/package/singleton-patternc  (Yes, this is my work too (づ｡◕‿‿◕｡)づ)
   */
  static getInstance() {
    const EB = singletonify(EventBus);
    return new EB();
  }

  constructor(name: string = '__NAME__') {
    nameMap.set(this, name);
  }

  setName(name: string) {
    expect(typeof name === 'string', `'name' must be a string`);
    nameMap.set(this, name);
  }

  get name(): string {
    return nameMap.get(this) || '[Anonymous __NAME__]';
  }

  /**
   * Map of string named events
   */
  private readonly _stringEvents = new Map<string, Map<Id, EventConfig>>();

  /**
   * Map of all other events
   */
  private readonly _events = new Map<NonStringEventName, Map<Id, EventConfig>>();

  /**
   * Map of id to event identifier
   */
  private readonly _idMap = new Map<Id, EventIdentifier>();

  /**
   * Used to generate unique id for each event listener.
   */
  private _id: number = 0;

  private _setEvent(identifier: EventIdentifier, configs: Map<Id, EventConfig>) {
    if (typeof identifier === 'string') {
      this._stringEvents.set(identifier, configs);
    } else {
      this._events.set(identifier, configs);
    }
  }

  private _getEvent(identifier: EventIdentifier) {
    if (typeof identifier === 'string') {
      return this._stringEvents.get(identifier);
    } else {
      return this._events.get(identifier);
    }
  }

  private _deleteEvent(identifier: EventIdentifier) {
    if (typeof identifier === 'string') {
      this._stringEvents.delete(identifier);
    } else {
      this._events.delete(identifier);
    }
  }

  /**
   * Using wildcard to match all config sets of an event.
   * @param identifier
   */
  private _matchEvents(identifier: EventIdentifier): Map<number, EventConfig>[] {
    if (typeof identifier !== 'string') {
      const configs = this._events.get(identifier);
      return configs ? [configs] : [];
    }

    const matched: Map<number, EventConfig>[] = [];

    // Check exact match first
    const exactConfig = this._stringEvents.get(identifier);
    if (exactConfig) {
      matched.push(exactConfig);
    }

    // Check wildcard patterns
    this._stringEvents.forEach((configs, pattern) => {
      if (pattern === identifier) {
        return; // already handled above
      }

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
    });

    return matched;
  }

  // #region Registeration

  private _register(identifier: EventIdentifier, listener: Fn, capacity: number): number {
    const configs = this._getEvent(identifier);

    const newId = this._id++;
    const entry: EventConfig = {
      listener,
      capacity,
    };

    if (configs) {
      configs.set(newId, entry);
    } else {
      const newConfig = new Map<Id, EventConfig>();
      newConfig.set(newId, entry);
      this._setEvent(identifier, newConfig);
    }

    this._idMap.set(newId, identifier);

    return newId;
  }

  /**
   * Register an event. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   *
   * _WILDCARD_RULES_
   *
   * @param identifier name of the event
   * @param listener will be called if matched
   * @param capacity trigger limit, if omitted, it will be `Infinity`
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public on(identifier: EventIdentifier, listener: Fn, capacity?: number): number;
  public on(...args: unknown[]): number {
    expect(args.length >= 2, 'Not enough arguments!');
    const [a, b, c] = args as [EventIdentifier, Fn, number];
    switch (args.length) {
      case 2:
        expect._identifier(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        return this._register(a, b, Infinity);
      default:
        expect._identifier(a);
        expect(typeof b === 'function', `'listener' must be a function`);
        expect(isSafeInteger(c) && c > 0, `'capacity' must be a positive integer`);
        return this._register(a, b, c);
    }
  }

  /**
   * Register an event that can only be triggered once. **Anything** can be an event identifier
   * - Specially, if only 1 argument is provided(and it is a function), it will be treated as both identifier and listener
   *
   * _WILDCARD_RULES_
   *
   * @param identifier name of the event
   * @param listener will be called if matched
   * @returns unique `id` of the registered identifier-listener entry
   * @throws invalid `identifier`
   */
  public once(identifier: EventIdentifier, listener: Fn): number;
  public once(...args: unknown[]): number {
    expect(args.length >= 2, 'Not enough arguments!');
    const [a, b] = args as [EventIdentifier, Fn];
    expect._identifier(a);
    expect(typeof b === 'function', `'listener' must be a function`);
    return this._register(a, b, 1);
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
    const map = this._getEvent(identifier);
    if (!map) {
      return false;
    }
    map.forEach((_, id) => this._idMap.delete(id));
    this._deleteEvent(identifier);
    return true;
  }

  /**
   * `id` is returned by `on()` or `once()`
   * @param id the id of the listener
   * @returns `false` if removed nothing
   */
  public removeListener(id: number): boolean {
    expect(typeof id === 'number', `'id' must be a number`);

    const identifier = this._idMap.get(id);
    if (identifier === undefined) {
      return false;
    }
    const idConfigMap = this._getEvent(identifier);
    if (idConfigMap === undefined) {
      return false;
    }

    const a = this._idMap.delete(id);
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
    this._stringEvents.clear();
    this._idMap.clear();
  }

  /**
   * Trigger an event by name
   *
   * _WILDCARD_RULES_
   *
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
    expect._emitIdentifier(identifier);
    const maps = this._matchEvents(identifier);
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
          identifier: this._idMap.get(id),
          rest: --cfg.capacity,
        };
        if (cfg.capacity <= 0) {
          maps[i].delete(id);
          this._idMap.delete(id);
        }
      });
    }

    return result.ids.length === 0 ? null : result;
  }
}
