/**
 * Type of an event handler, it is just a normal function
 */
type Fn = (...args: unknown[]) => unknown;

/**
 * Event configuration, including name, handler function, trigger limit and whether handler is an arrow function
 */
interface EventConfig {
  id: number;

  /**
   * Event handler. Whether it is an arrow function will affect binding of thisArg.
   * @see comment of function 'emitWithThisArg'
   */
  handler: Fn;

  /**
   * Trigger limit, the handler will expire when it reaches this limit. Undefined means it can be triggered infinite times.
   */
  capacity: number;
}

interface EmitResult {
  /**
   *
   */
  result: unknown;

  evt: string;

  /**
   * Number of handlers that have expired and been removed.
   */
  expired: boolean;
}
