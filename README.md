# Ts-Event-Bus

这是一个适用于 JavaScript 和 TypeScript 的全局事件总线仓库。

## 文档语言

[简体中文](README.md)

[English](readme/README_en.md)

## 安装

### 使用 npm

```shell
npm i ts-event-bus
```

### 使用 yarn

```shell
yarn add ts-event-bus
```

### 使用 pnpm

```shell
pnpm i ts-event-bus
```

## 使用方法

### 引入

```typescript
import { EventBus } from 'ts-event-bus';
```

或者

```typescript
const EventBus = require('ts-event-bus').EventBus;
```

### 创建实例

```typescript
const bus = new EventBus();
```

### 基本使用

#### 注册事件

capacity 表示该事件限定触发的次数，超过后不会再触发。如果没有设置 capacity，则可以无限次触发。

```typescript
bus.on(eventName: string, handler: Function, capacity?: number);
```

只能被触发 1 次的事件，等价于 bus.on(eventName, handler, 1)。

```typescript
bus.once(eventName: string, handler: Function);
```

#### 触发事件

可加参数。**事件名称不能含有 `*`号。**

```typescript
bus.emit(eventName: string, ...args: any);
```

#### 注销事件

注销事件和其对应的所有 handler，如果指定 handler 则只注销此事件下的特定 handler。
注意！注销事件**不会进行通配符匹配**，必须使用和注册的时候一样的事件名。
_例如：注册用“evt.”，那么注销也要用“evt.”，用“evt.a”是不行的。_

```typescript
bus.off(eventName: string, handler?: Function);
```

#### 清空所有事件

```typescript
bus.clear();
```

#### 例子

用事件名和处理函数来注册事件

```typescript
bus.on('evt', () => {
  console.log('evt triggered');
});

// 触发事件
bus.emit('evt');
// output: evt triggered
```

传递参数的情形

```typescript
bus.on('evt', (arg1, arg2) => {
  console.log({ arg1, arg2 });
});

bus.emit('evt', '参数1', '参数2');
// output: { arg1: '参数1', arg2: '参数2' }
```

指定次数的情形

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
// 触发3次后，handler已经自动注销

// 再调用已经不再会触发
bus.emit('evt');

/* output:
count 1
count 2
count 3
*/
```

### 进阶使用

#### 绑定 thisArg

此时推荐使用普通函数，不要使用箭头函数。（如果使用会触发控制台警告）

与 emit 不同之处在于第二个参数是 thisArg。

```typescript
bus.emitWithThisArg(eventName: string, thisArg: any, ...args: any);
```

#### 例子

```typescript
// 不要使用箭头函数
const handler = function (arg) {
  console.log(this.a + arg.b);
};

bus.on('evt', handler);

bus.emitWithThisArg('evt', { a: 3 }, { b: 2 });
// output: 5
```

#### 通配符事件名

支持使用通配符 `*`来注册事件，需要使用 `a.*`或者 `a.*.a`这样的格式来指定事件名称。其中 `*`可以匹配任何除了 `*`和 `.`以外的字符。

**请不要使用类似于 `*.*`或 `*evt`这样的名称！** 这样的名称也许能精确匹配但不属于通配范围，不一定能达到你期望的效果

```typescript
bus.on('evt.*', () => {});
```

那么

- `evt.3` **会**触发
- `evt.name` **会**触发
- `evt.` **不会**触发

通配符会导致多重触发，例如我们注册如下两个事件

```typescript
bus.on('evt.*.*', () => {}); // 第1个事件
bus.on('evt.3.*', () => {}); // 第2个事件
```

那么

- `evt.4.a` 只会触发**第一个**事件
- `evt.3.a` **两个**都会触发

#### 重复注册

同一个名字的事件重复添加同一个函数时，不会重复注册事件，只会更新 capacity。

此时会在控制台弹出 warn 警告。

```typescript
const handler = () => {};
// 此时handler触发10次就会销毁
bus.on('evt', handler, 10);

// capacity会更新为undefined，从而handler可以无限次触发
bus.on('evt', handler);
```

### Debug 时使用

```typescript
// 开启日志
bus.turnOnLog();

// 关闭日志
bus.turnOffLog();

// 打印所有事件和其handler。日志关闭时不会打印，但可以设置forced=true来强制打印
bus.logEventMaps(forced?: boolean);
```

# License 许可

GPLv3

### Keywords

- [event](https://www.npmjs.com/search?q=keywords:event)
- [bus](https://www.npmjs.com/search?q=keywords:bus)
- [node](https://www.npmjs.com/search?q=keywords:node)
- [nodejs](https://www.npmjs.com/search?q=keywords:nodejs)
