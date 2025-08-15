<p align="center">
  <img src="https://github.com/baendlorel/any-event/releases/download/assets/any-event.png" alt="any-event logo" width="240" />
</p>

A lightweight, flexible event bus for JavaScript/TypeScript. Supports any type of event identifier, wildcard event names, and listener capacity control. Powered by `singleton-pattern`.

---

## Installation

```bash
pnpm add any-event
# or
npm install any-event
```

## Usage

```ts
import { eventBus } from 'any-event';

// Register a listener
eventBus.on('user.login', (user) => {
  console.log('User logged in:', user);
});

// Emit an event
eventBus.emit('user.login', { name: 'Alice' });

// Wildcard support
eventBus.on('user.*', () => console.log('Any user event!'));
eventBus.emit('user.logout'); // triggers wildcard

// Set the name of the eventBus
eventBus.name; // 'AnyEvent'
eventBus.setName('MyEventBus'); // eventBus.name is now 'MyEventBus'
```

## API

### `eventBus.on(identifier, listener, capacity?)`

Register a listener for an event. `identifier` can be any value. `capacity` (optional) limits how many times the listener can be triggered.

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
5. Cannot starts or ends with `.`
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

KasukabeTsumugi  
futami16237@gmail.com

---

Enjoy! (づ｡◕‿‿◕｡)づ
