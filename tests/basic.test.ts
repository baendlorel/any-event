import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Basic', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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
        identifier: 'test',
        rest: Infinity - 1,
      },
    });
  });
});
