import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus, eventBus } from '../src/index.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('Basic functionality', () => {
    it('should register and emit events', () => {
      const listener = vi.fn();
      bus.on('test', listener);

      const result = bus.emit('test', 'hello', 'world');

      expect(listener).toHaveBeenCalledWith('hello', 'world');
      expect(result).not.toBeNull();
      expect(result!.ids).toHaveLength(1);
    });

    it('should register listener as event name when only one argument', () => {
      const listener = vi.fn();
      bus.on(listener);

      const result = bus.emit(listener, 'data');

      expect(listener).toHaveBeenCalledWith('data');
      expect(result).not.toBeNull();
    });

    it('should handle once events', () => {
      const listener = vi.fn();
      bus.once('test', listener);

      bus.emit('test', 'first');
      bus.emit('test', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('first');
    });

    it('should handle capacity limits', () => {
      const listener = vi.fn();
      bus.on('test', listener, 2);

      bus.emit('test', 'first');
      bus.emit('test', 'second');
      bus.emit('test', 'third');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should return emit results with correct structure', () => {
      const listener = vi.fn().mockReturnValue('result');
      const id = bus.on('test', listener);

      const result = bus.emit('test', 'data');

      expect(result).toEqual({
        ids: [id],
        [id]: {
          result: 'result',
          event: 'test',
          rest: Infinity - 1,
        },
      });
    });
  });

  describe('Event removal', () => {
    it('should remove listener by id', () => {
      const listener = vi.fn();
      const id = bus.on('test', listener);

      const removed = bus.removeListener(id);
      bus.emit('test');

      expect(removed).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove all listeners for an event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('test', listener1);
      bus.on('test', listener2);

      bus.off('test');
      bus.emit('test');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should clear all events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('test1', listener1);
      bus.on('test2', listener2);

      bus.clear();
      bus.emit('test1');
      bus.emit('test2');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Wildcard patterns', () => {
    it('should match single-level wildcard', () => {
      const listener = vi.fn();
      bus.on('user.*', listener);

      bus.emit('user.login', 'data');
      bus.emit('user.logout', 'data');
      bus.emit('user.profile.update', 'data'); // should not match

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should match multi-level wildcard', () => {
      const listener = vi.fn();
      bus.on('user.**', listener);

      bus.emit('user.login', 'data');
      bus.emit('user.profile.update', 'data');
      bus.emit('user.settings.privacy.change', 'data');
      bus.emit('admin.login', 'data'); // should not match

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should match exact prefix with multi-level wildcard', () => {
      const listener = vi.fn();
      bus.on('user.**', listener);

      bus.emit('user', 'data'); // should match the prefix itself
      bus.emit('user.action', 'data');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed wildcard patterns', () => {
      const listener = vi.fn();
      bus.on('user.*.settings', listener);

      bus.emit('user.admin.settings', 'data');
      bus.emit('user.guest.settings', 'data');
      bus.emit('user.admin.profile', 'data'); // should not match
      bus.emit('user.admin.settings.privacy', 'data'); // should not match

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should match both exact and wildcard listeners', () => {
      const exactListener = vi.fn();
      const wildcardListener = vi.fn();

      bus.on('user.login', exactListener);
      bus.on('user.*', wildcardListener);

      const result = bus.emit('user.login', 'data');

      expect(exactListener).toHaveBeenCalledWith('data');
      expect(wildcardListener).toHaveBeenCalledWith('data');
      expect(result!.ids).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid wildcard patterns', () => {
      expect(() => bus.on('*user', vi.fn())).toThrow();
      expect(() => bus.on('user*', vi.fn())).toThrow();
      expect(() => bus.on('us*er', vi.fn())).toThrow();
    });

    it('should throw error for invalid listener type', () => {
      expect(() => bus.on('test', 'not a function' as any)).toThrow('must be a function');
    });

    it('should throw error for invalid capacity', () => {
      expect(() => bus.on('test', vi.fn(), 0)).toThrow('must be a positive integer');
      expect(() => bus.on('test', vi.fn(), -1)).toThrow('must be a positive integer');
      expect(() => bus.on('test', vi.fn(), 1.5)).toThrow('must be a positive integer');
    });

    it('should throw error for insufficient arguments', () => {
      expect(() => (bus as any).on()).toThrow('Not enough arguments!');
      expect(() => (bus as any).once()).toThrow('Not enough arguments!');
    });
  });

  describe('Non-string event names', () => {
    it('should handle symbol event names', () => {
      const sym = Symbol('test');
      const listener = vi.fn();
      bus.on(sym, listener);

      const result = bus.emit(sym, 'data');

      expect(listener).toHaveBeenCalledWith('data');
      expect(result).not.toBeNull();
    });

    it('should handle number event names', () => {
      const listener = vi.fn();
      bus.on(42, listener);

      const result = bus.emit(42, 'data');

      expect(listener).toHaveBeenCalledWith('data');
      expect(result).not.toBeNull();
    });

    it('should handle object event names', () => {
      const eventObj = { type: 'custom' };
      const listener = vi.fn();
      bus.on(eventObj, listener);

      const result = bus.emit(eventObj, 'data');

      expect(listener).toHaveBeenCalledWith('data');
      expect(result).not.toBeNull();
    });
  });

  describe('Singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should work with exported singleton', () => {
      const listener = vi.fn();
      eventBus.on('test', listener);

      const result = eventBus.emit('test', 'data');

      expect(listener).toHaveBeenCalledWith('data');
      expect(result).not.toBeNull();

      // Clean up for other tests
      eventBus.clear();
    });
  });

  describe('Edge cases', () => {
    it('should return null when emitting non-existent event', () => {
      const result = bus.emit('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle empty event names', () => {
      const listener = vi.fn();
      bus.on('', listener);

      const result = bus.emit('');

      expect(listener).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('should handle events with dots but no wildcards', () => {
      const listener = vi.fn();
      bus.on('user.login.success', listener);

      bus.emit('user.login.success', 'data');
      bus.emit('user.login', 'data'); // should not match

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should remove expired listeners after emission', () => {
      const listener = vi.fn();
      bus.on('test', listener, 1);

      const result1 = bus.emit('test', 'first');
      const result2 = bus.emit('test', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(result1!.ids).toHaveLength(1);
      expect(result2).toBeNull();
    });
  });
});
