import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { EventBus } from '../src';
import { green } from './color';

const bus = new EventBus();
let no = 1;
beforeEach(() => {
  console.log(green(`[${no}]==============================[${no}]`));
  bus.clear();
  no++;
});

describe('EventBus class', () => {
  test(`注册事件evt1并触发`, () => {
    return expect(
      new Promise((resolve) => {
        bus.on('evt1', () => {
          resolve(true);
        });
        bus.emit('evt1');
      })
    ).resolves.toBe(true);
  });

  test(`注册once事件evt2，触发1次`, () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.once('evt2', callback);
        bus.emit('evt2');
        setTimeout(() => {
          resolve(callback);
        }, 200);
      })
    ).resolves.toBeCalledTimes(1);
  });

  test(`注册事件evt3，上限2次，并触发3次`, () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.on('evt3', callback, 2);
        bus.emit('evt3');
        bus.emit('evt3');
        bus.emit('evt3');
        setTimeout(() => {
          resolve(callback);
        }, 200);
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
        test4EventNames.forEach((en) => {
          bus.emit(en);
        });
        setTimeout(() => {
          resolve(callback);
        }, 200);
      })
    ).resolves.toBeCalledTimes(6);
  });

  test(`注册事件evt5并携带2个参数触发`, () => {
    return expect(
      new Promise((resolve) => {
        bus.on('evt5', (arg1, arg2) => {
          resolve({ arg1, arg2 });
        });
        bus.emit('evt5', 'a1', 'a2');
      })
    ).resolves.toEqual({ arg1: 'a1', arg2: 'a2' });
  });

  test(`注册事件evt6并携带1个参数不带thisArg触发`, () => {
    return expect(
      new Promise((resolve) => {
        bus.on('evt6', (args) => {
          resolve(args.c);
        });
        const obj = {
          a: 1,
          b: 2,
          get c() {
            return this.a + this.b;
          },
        };
        bus.emit('evt6', obj);
      })
    ).resolves.toEqual(3);
  });

  test(`分别用普通函数和箭头函数注册事件evt7并携带thisArg触发`, () => {
    const obj = {
      a: 1,
      b: 2,
      get c() {
        return this.a + this.b;
      },
    };
    return expect(
      Promise.all([
        new Promise((resolve) => {
          bus.on('evt7', function () {
            resolve((this as any).c);
          });
          bus.emitWithThisArg('evt7', obj);
        }),
        new Promise((resolve) => {
          bus.on('evt7-arrowfunc', () => {
            resolve(this === undefined ? 'this is undefined' : (this as any).c);
          });
          bus.emitWithThisArg('evt7-arrowfunc', obj);
        }),
      ])
    ).resolves.toEqual([3, 'this is undefined']);
  });

  test(`注册事件evt8.*.*和evt8.a.*，并同时触发两者`, () => {
    return expect(
      new Promise((resolve) => {
        const callback = jest.fn();
        bus.on('evt8.*.*', callback);
        bus.on('evt8.a.*', callback);
        bus.emit('evt8.a.2');
        bus.emit('evt8.a.*');
        setTimeout(() => {
          resolve(callback);
        }, 200);
      })
    ).resolves.toBeCalledTimes(4);
  });

  test(`注册事件evt9，重复添加handler，执行次数从undefined被更新为6次`, () => {
    return expect(
      new Promise((resolve) => {
        const map = Reflect.get(bus, 'eventMap') as any;
        const callback = () => 1;
        bus.on('evt9', callback);
        const capacity1 = (Array.from(map.get('evt9'))[0] as any).capacity;
        bus.on('evt9', callback, 6);
        const capacity2 = (Array.from(map.get('evt9'))[0] as any).capacity;
        bus.logEventMaps();
        const size = map.get('evt9').size;
        resolve({ size, capacity1, capacity2 });
      })
    ).resolves.toEqual({ size: 1, capacity1: undefined, capacity2: 6 });
  });
});
