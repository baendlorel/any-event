import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Edge', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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
