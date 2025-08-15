import { EventBus } from './event-bus.js';

/**
 * ## Usage
 * A singleton instance of EventBus.
 *
 * Use `eventBus.on`, `eventBus.off`, `eventBus.emit`, etc.
 * - empowered by npm package `singleton-pattern`
 * @see https://www.npmjs.com/package/singleton-patternc  (Yes, tbhis is my work too (づ｡◕‿‿◕｡)づ)
 *
 * __PKG_INFO__
 */
const eventBus = EventBus.getInstance();
export { EventBus, eventBus };
