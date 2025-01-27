import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { EventBus } from '../src';
const color = {
  green: (text: string) => `\x1B[32m${text}\x1B[0m`,
  yellow: (text: string) => `\x1B[33m${text}\x1B[0m`,
  red: (text: string) => `\x1B[31m${text}\x1B[0m`,
};

const bus = new EventBus();
let no = 1;
beforeEach(() => {
  console.log(color.green(`[${no}]==============================`));
  no++;
});

describe('EventBus class', () => {
  test(`注册事件evt1并触发`, () => {
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

  test(`注册once事件evt2，触发1次`, () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.once('evt2', callback);
        bus.logEventMaps();
        bus.emit('evt2');
        setTimeout(() => {
          resolve(callback);
          bus.logEventMaps();
        }, 100);
      })
    ).resolves.toBeCalledTimes(1);
  });

  test(`注册事件evt3，上限2次，并触发3次`, () => {
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
        }, 100);
      })
    ).resolves.toBeCalledTimes(2);
  });

  const test4EventNames = [
    'evt4.ad.fr3w',
    'evt4.*.*',
    'evt4.321.*',
    'evt4.**.**',
    'evt4.*.**',
    'evt4.*.4fwe',
  ];
  test(`通配符事件evt4.*.*，${test4EventNames.join()}用来触发，应该触发6次`, () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.on('evt4.*.*', callback);
        bus.logEventMaps();
        test4EventNames.forEach((en) => {
          bus.emit(en);
        });
        setTimeout(() => {
          resolve(callback);
          bus.logEventMaps();
        }, 100);
      })
    ).resolves.toBeCalledTimes(6);
  });

  test(`注册事件evt5并携带2个参数触发`, () => {
    return expect(
      new Promise((resolve) => {
        bus.on('evt5', (arg1, arg2) => {
          resolve({ arg1, arg2 });
        });
        bus.logEventMaps();
        bus.emit('evt5', 'a1', 'a2');
      })
    ).resolves.toEqual({ arg1: 'a1', arg2: 'a2' });
  });
});
