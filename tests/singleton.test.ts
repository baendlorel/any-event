import { describe, expect, it, vi } from 'vitest';
import { EventBus, eventBus } from '../src/index.js';

describe('EventBus Singleton', () => {
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
    eventBus.clear();
  });
});
