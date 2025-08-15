import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

describe('EventBus Wildcard', () => {
  let bus: EventBus;
  beforeEach(() => {
    bus = new EventBus();
  });

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

  it('user.** matches user.login, user.profile.update, user.settings.privacy.change, and user itself', () => {
    const listener = vi.fn();
    bus.on('user.**', listener);
    bus.emit('user.login', 'login');
    bus.emit('user.profile.update', 'profile');
    bus.emit('user.settings.privacy.change', 'privacy');
    bus.emit('user', 'root');
    bus.emit('userx', 'should not match');
    bus.emit('userx.login', 'should not match');
    expect(listener).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenCalledWith('login');
    expect(listener).toHaveBeenCalledWith('profile');
    expect(listener).toHaveBeenCalledWith('privacy');
    expect(listener).toHaveBeenCalledWith('root');
  });

  it('should throw error for invalid wildcard event names', () => {
    expect(() => bus.on('*', vi.fn())).toThrow();
    expect(() => bus.on('**', vi.fn())).toThrow();
    expect(() => bus.on('user**', vi.fn())).toThrow();
    expect(() => bus.on('**.user', vi.fn())).toThrow();
    expect(() => bus.on('user.**.settings', vi.fn())).toThrow();
    expect(() => bus.on('user*', vi.fn())).toThrow();
    expect(() => bus.on('us*er', vi.fn())).toThrow();
    expect(() => bus.on('.user.*', vi.fn())).toThrow();
    expect(() => bus.on('user.*.', vi.fn())).toThrow();
  });

  it('should allow valid wildcard event names', () => {
    expect(() => bus.on('user.*', vi.fn())).not.toThrow();
    expect(() => bus.on('user.**', vi.fn())).not.toThrow();
    expect(() => bus.on('user.*.settings', vi.fn())).not.toThrow();
    expect(() => bus.on('order.*', vi.fn())).not.toThrow();
    expect(() => bus.on('order.**', vi.fn())).not.toThrow();
    expect(() => bus.on('*.end', vi.fn())).not.toThrow();
  });
});
