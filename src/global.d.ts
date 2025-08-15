/**
 * Type of an event listener, it is just a normal function
 */
type Fn = (...args: unknown[]) => unknown;

type Id = number;

type EventName = string | number | symbol;

/**
 * Event configuration, including name, listener function, trigger limit and whether listener is an arrow function
 */
interface EventConfig {
  /**
   * Event listener. Whether it is an arrow function will affect binding of thisArg.
   * @see comment of function 'emitWithThisArg'
   */
  listener: Fn;

  /**
   * Trigger limit, the listener will expire when it reaches this limit. Undefined means it can be triggered infinite times.
   */
  capacity: number;
}

interface EmitResult {
  evt: EventName;
  id: number;

  /**
   *
   */
  result: unknown;

  /**
   * How many times remaining for the listener to be triggered.
   * - if `0`, the listener will be expired after this call.
   */
  rest: number;
}
