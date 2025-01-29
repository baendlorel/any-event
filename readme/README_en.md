# Ts-Event-Bus

This is an event hub module for both JavaScript and TypeScript.

## Document Language

[简体中文](../README.md)

[English](README_en.md)

## Installation

### Using npm

```shell
npm i ts-event-bus
```

### Using yarn

```shell
yarn add ts-event-bus
```

### Using pnpm

```shell
pnpm i ts-event-bus
```

## Usage

### How to import

```typescript
import { EventBus } from 'ts-event-bus';
```

or

```typescript
const EventBus = require('ts-event-bus').EventBus;
```

Create Instance

```typescript
const bus = new EventBus();
```

基本使用方法（Basic usage lies below）：

```typescript
// 注册事件，capacity表示该事件限定触发的次数，超过后不会再触发
// 如果没有设置capacity，则可以无限次触发
// Register events. Capacity means it will be triggered a limited number of times.
// If capacity is not set, the event will be able to be triggered infinite times.
bus.on(eventName: string, handler: Function, capacity?: number);

// 只能被触发1次的事件，等价于bus.on(eventName,()=>{},1);
// Register an event that can only be triggered once.
bus.once(eventName: string, handler: Function);

// 触发事件，可加参数。事件名称不能含有*
// Trigger the event. Arguments can be provided. EventName must not include *
bus.emit(eventName: string, ...args: any);

// 注销事件和其对应的所有handler，如果指定handler则只注销次事件下的特定handler
// 注意！注销事件不会进行通配符匹配，必须使用和注册的时候一样的事件名
// 例如：注册用“evt.*”，那么注销也要用“evt.*”，用“evt.a”是不行的
// Unregister the event with its all handlers. If a specific handler is given, it will be unregistered.
// Note that wildcard cannot be used here, we must use the same eventName as the event was registered.
// Example: When use "evt.*" to register, we must use "evt.*" to unregister it. Using "evt.a" will not work.
bus.off(eventName: string, handler?: Function);

// 清空所有事件
// Clear all events.
bus.clear();
```

例子（Example）：

```typescript
// 用事件名和处理函数来注册事件
// Register an event with name and handler function
bus.on('evt', () => {
  console.log('evt triggered');
});

// 触发事件
// Trigger the registered event
bus.emit('evt');
// output: evt triggered
```

传递参数的情形（Trigger with arguments）：

```typescript
bus.on('evt', (arg1, arg2) => {
  console.log({ arg1, arg2 });
});

bus.emit('evt', '参数1', '参数2');
// output: { arg1:'参数1', arg2:'参数2' }
```

指定次数的情形（Appoint capacity of the handler）：

```typescript
let count = 0;
bus.on(
  'evt',
  () => {
    count++;
    console.log('count', count);
  },
  3
);

bus.emit('evt');
bus.emit('evt');
bus.emit('evt');
// 3次调用后事件自动注销
// After 3 calls, the handler is unregistered automatically.

// 再调用已经不再会触发
// This handler will not be triggered anymore.
bus.emit('evt');

/* output:
count 1
count 2
count 3
*/
```

支持绑定 thisArg，此时推荐使用普通函数，不要使用箭头函数。（如果使用会触发控制台警告）

Support binding thisArg, and when doing so, we recommend you not to use arrow functions. (If you use arrow function in this case, there will be a console warn message)

```typescript
// 与emit不同之处在于第二个参数是thisArg
// The second parameter is thisArg
bus.emitWithThisArg(eventName: string, thisArg: any, ...args: any);
```

```typescript
// 不要使用箭头函数
// Do not use arrow function
const handler = function (arg) {
  console.log(this.a + arg.b);
};

bus.on('evt', handler);

bus.emitWithThisArg('evt', { a: 3 }, { b: 2 });
// output: 5
```

支持使用通配符 `*`来注册事件，需要使用 `a.*`或者 `a.*.a`这样的格式来指定事件名称。其中 `*`可以匹配任何除了它自己以外的字符

Support wildcards. We can use `a.*` or `a.*.a` to register events. The `*` part can be matched by anything but `*` itself.

```typescript
bus.on('evt.*', () => {});

bus.emit('evt.3'); // 会触发 Will be triggered
bus.emit('evt.name'); // 会触发 Will be triggered
bus.emit('evt.'); // 不会触发 This will not trigger the event
```

通配符会导致多重触发（Wildcards lead to multiple triggers）：

```typescript
bus.on('evt.*.*', () => {});
bus.on('evt.3.*', () => {});

// 只会触发第一个事件
// Only the first event will be triggered
bus.emit('evt.4.a');

// 两个都会触发
// Both 2 events will be triggered
bus.emit('evt.3.a');
```

同一个名字的事件重复添加同一个函数时，不会重复注册事件只会更新 capacity，且此时会在控制台弹出 warn 警告

When adding the same handler function to the same eventName, the handler will not be registered again and only the capacity will be updated.There will be a warning message shown in console when this happens.

```typescript
const handler = () => {};
bus.on('evt', handler, 10);

// capacity会更新为undefined，从而可以无限次触发
// capacity will change to undefined such that the event can be triggered infinite times.
bus.on('evt', handler);
```

Debug 时使用（Use when debugging）：

```typescript
// 开启日志
// Turn on log
bus.turnOnLog();

// 关闭日志
// Turn off log
bus.turnOffLog();

// 打印所有事件和其handler。日志关闭时不会打印，但可以设置forced=true来强制打印
// Print all events and their handlers. Will not print when log is off, but can be forced by letting forced = true.
bus.logEventMaps(forced?: boolean);
```
