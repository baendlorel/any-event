<p align="center">
  <img src="https://github.com/baendlorel/wildcard-event/releases/download/assets/wildcard-event.png" alt="wildcard-event logo" width="240" />
</p>

A lightweight, flexible event bus for JavaScript/TypeScript. Supports any type of event identifier, wildcard event names, and listener capacity control. You can even get an `id` from `eventBus.on` and get emit result from `eventBus.emit`!

For more awesome packages, check out [my homepage💛](https://baendlorel.github.io/?repoType=npm)

---

## Installation

```bash
pnpm add wildcard-event
# or
npm install wildcard-event
```

## Basic Usage

```ts
import { eventBus } from 'wildcard-event';

// Wildcard support
eventBus.on('user.*', () => console.log('Any user event!'));
eventBus.emit('user.logout'); // triggers wildcard

// Emit
const emitResult = eventBus.emit('user.login', { name: 'Alice' });

// Set the name of the eventBus
eventBus.name; // it is readonly
eventBus.setName('MyEventBus'); // eventBus.name is now 'MyEventBus'
```

## Breaking Feature!

**emit** method now returns an object(interface: `EmitResult`). With the identifier-listener entry id, you can get the specific handler result if you want to.

```ts
// save the unique 'identifier-listener' id returned from `on` method
const listener = (user) => {
  console.log('User logged in:', user);
};
const id = eventBus.on('user.*', listener);

// emit an event and receive its result
const emitResult = eventBus.emit('user.login', { name: 'Alice' });
```

Then the `emitResult` will look like this:

```ts
expect(emitResult).toEqual({
  ids: [id], // array of listener ids that were triggered
  [id]: {
    identifier: 'user.*', // the matched identifier when it was registered
    result: listener({ name: 'Alice' }), // result of the listener
    rest: Infinity, // remaining capacity (if set)
  },
});
```

> Note: The listener can be an async function, which makes `emitResult[someId].result` a Promise.

## API

### `eventBus.on(identifier, listener, capacity?)`

Register a listener for an event. `identifier` can be any value. `capacity` (optional) limits how many times the listener can be triggered.

- Default `capacity` is `Infinity`.
- When emitting, the listeners will be called in the order they were registered.

### `eventBus.once(identifier, listener)`

Register a listener that will be triggered only once.

### `eventBus.off(identifier)`

Remove all listeners for the given event identifier.

### `eventBus.removeListener(id)`

Remove a specific listener by its id (returned from `on`/`once`).

### `eventBus.emit(identifier, ...args)`

Trigger an event. Returns `null` if no listener is found, or an object with results and remaining capacity.

### Wildcard Rules

1. `*` matches a single segment (e.g. `user.*` matches `user.login`, not `user.profile.update`)
2. `**` matches multiple segments (e.g. `user.**` matches `user.login`, `user.profile.update`, `user.settings.privacy.change`, and `user` itself)
3. Cannot use both `**` and `*` in the same identifier
4. Cannot use more than 2 `*`s, like `***` or more
5. Cannot start or end with a dot (`.`).
6. Mixed: `user.*.settings` matches `user.admin.settings`, `user.guest.settings`
7. Only registration (on/once) supports wildcards; emit must use concrete event names

## Types

```ts
type Fn = (...args: unknown[]) => unknown;
interface EventConfig {
  listener: Fn;
  capacity: number;
}
interface EmitResultValue {
  identifier: unknown;
  result: unknown;
  rest: number;
}
interface EmitResult {
  ids: number[];
  [key: number]: EmitResultValue;
}
```

## Author

Kasukabe Tsumugi  
futami16237@gmail.com

---

Enjoy! (づ｡◕‿‿◕｡)づ
