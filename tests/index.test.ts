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
    hr();
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

  test('注册once事件evt2，触发1次', () => {
    hr();
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.once('evt2', callback);
        bus.logEventMaps();
        bus.emit('evt2');
        setTimeout(() => {
          resolve(callback);
          bus.logEventMaps();
        }, 300);
      })
    ).resolves.toBeCalledTimes(1);
  });

  test('注册事件evt3，上限2次，并触发3次', () => {
    hr();
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.on('evt3', callback, 2);
        bus.logEventMaps();
        bus.emit('evt3');
        bus.emit('evt3');
        bus.emit('evt3');
        setTimeout(() => {
          resolve(callback);
          bus.logEventMaps();
        }, 300);
      })
    ).resolves.toBeCalledTimes(2);
  });
});
