import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Remove', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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
