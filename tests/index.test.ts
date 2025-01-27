import { describe, expect, test } from '@jest/globals';
import { EventBus } from '../src';

const bus = new EventBus();

describe('EventBus class', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(1 + 2).toBe(3);
  });
});
