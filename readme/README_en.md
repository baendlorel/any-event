# js-event-bus-lite

This is an event hub module for both JavaScript and TypeScript.

## Document Language

[简体中文](../README.md)

[English](README_en.md)

## Installation

### Using npm

```shell
npm i js-event-bus-lite
```

### Using yarn

```shell
yarn add js-event-bus-lite
```

### Using pnpm

```shell
pnpm i js-event-bus-lite
```

## Usage

### How to import

#### Importing in browser application

If you want to use it in your Browser apps you can import the library like this. [Download in GitHub](../dist/js-event-bus-lite.min.js)

```html
<body>
  <div>Put your content here</div>

  <script src="your-folder/js-event-bus-lite.min.js"></script>
  <script>
    const eventBus = new EventBus();
  </script>
</body>
```

#### Importing in your NodeJS project or ES6 environment （Recommended）

```typescript
import EventBus from 'js-event-bus-lite';
```

or

```typescript
const EventBus = require('js-event-bus-lite');
```

Create Instance

```typescript
const bus = new EventBus();
```

### Basic usage

#### Register events

Capacity means it will be triggered a limited number of times.If capacity is not set, the event will be able to be triggered infinite times.

```typescript
bus.on(eventName: string, handler: Function, capacity?: number);
```

Register an event that can only be triggered once.Equivalent to bus.on(eventName, handler, 1)

```typescript
bus.once(eventName: string, handler: Function);
```

#### Trigger the event

Arguments can be provided. \*_EventName must not include `_`.

```typescript
bus.emit(eventName: string, ...args: any);
```

#### Unregister

Unregister the event with its all handlers. If a specific handler is given, it will be unregistered.
Note that **wildcard should not be used here**, we must use the same eventName as the event was registered.
_Example: When use "evt." to register, we must use "evt." to unregister it. Using "evt.a" will not work._

```typescript
bus.off(eventName: string, handler?: Function);
```

#### Clear all events

```typescript
bus.clear();
```

#### Example

Register an event with name and handler function

```typescript
bus.on('evt', () => {
  console.log('evt triggered');
});

// Trigger the registered event
bus.emit('evt');
// output: evt triggered
```

Trigger with arguments

```typescript
bus.on('evt', (arg1, arg2) => {
  console.log({ arg1, arg2 });
});

bus.emit('evt', 'param1', 'param2');
// output: { arg1: 'param1', arg2: 'param2' }
```

Appoint capacity of the handler

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
// After 3 calls, the handler is unregistered automatically.

// This handler will not be triggered anymore.
bus.emit('evt');

/* output:
count 1
count 2
count 3
*/
```

### Advanced usage

#### Binding thisArg

We recommend you not to use arrow functions. (If you use arrow function in this case, there will be a console warn message)

The second parameter is thisArg.

```typescript
bus.emitWithThisArg(eventName: string, thisArg: any, ...args: any);
```

#### Example

```typescript
// Do not use arrow function
const handler = function (arg) {
  console.log(this.a + arg.b);
};

bus.on('evt', handler);

bus.emitWithThisArg('evt', { a: 3 }, { b: 2 });
// output: 5
```

#### Wildcards

We can use `a.*` or `a.*.a` to register events. The `*` part can be matched by anything but `*`and `.`.

**Please do not use eventNames like `*.*` or `*evt`！** This is not included in wildcard match.It might not act like what you expected.

```typescript
bus.on('evt.*', () => {});
```

Then

- `evt.3` **will** trigger the event
- `evt.name` **will** trigger the event
- `evt.` **will** not trigger the event

Wildcards may lead to multiple triggers, as we register these 2 events below

```typescript
bus.on('evt.*.*', () => {}); // fisrt event
bus.on('evt.3.*', () => {}); // second event
```

Then

- `evt.4.a` Only the **first event** will be triggered
- `evt.3.a` Both **2 events** will be triggered

#### Duplicated registration

When adding the same handler function to the same eventName, the handler will not be registered again and only the capacity will be updated.

When this happens, there will be a warning message shown in console.

```typescript
const handler = () => {};
// Handler can be triggered for 10 times.
bus.on('evt', handler, 10);

// Now capacity will change to undefined such that the event can be triggered infinite times.
bus.on('evt', handler);
```

### Use when debugging

```typescript
// Turn on log
bus.turnOnLog();

// Turn off log
bus.turnOffLog();

// Print all events and their handlers. Will not print when log is off, but can be forced by letting forced = true.
bus.logEventMaps(forced?: boolean);
```

# License

GPLv3
