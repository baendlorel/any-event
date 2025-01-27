import { describe, expect, jest, test } from '@jest/globals';
import { EventBus } from '../src';
const color = {
  green: (text: string) => `\x1B[32m${text}\x1B[0m`,
  yellow: (text: string) => `\x1B[33m${text}\x1B[0m`,
  red: (text: string) => `\x1B[31m${text}\x1B[0m`,
};

const hr = () => {
  console.log(color.green('==============='));
};

const bus = new EventBus();

describe('EventBus class', () => {
  test('注册事件evt1并触发', () => {
    return expect(
      new Promise((resolve) => {
        bus.on('evt1', () => {
          resolve(true);
        });
        bus.logEventMaps();
        bus.emit('evt1');
      })
    ).resolves.toBe(true);
  });

  test('注册事件evt2，上限2次，并触发3次', () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.on('evt2', callback, 2);
        bus.logEventMaps();
        bus.emit('evt2');
        bus.emit('evt2');
        bus.emit('evt2');
        bus.logEventMaps();
        setTimeout(() => {
          resolve(callback);
        }, 1000);
      })
    ).resolves.toBeCalledTimes(2);
  });
});
