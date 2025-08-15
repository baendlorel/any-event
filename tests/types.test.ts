import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Types', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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
