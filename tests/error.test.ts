import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Error', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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
