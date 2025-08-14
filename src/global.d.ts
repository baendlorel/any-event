/**
 * Type of an event handler, it is just a normal function
 */
type EventHandler = (...args: any[]) => any;

/**
 * Event configuration, including name, handler function, trigger limit and whether handler is an arrow function
 */
type EventConfig = {
  /**
   * Event name. Used to locate the key of eventMap
   */
  name: string;

  /**
   * Event handler. Whether it is an arrow function will affect binding of thisArg.
   * @see comment of function 'emitWithThisArg'
   */
  handler: EventHandler;

  /**
   * Trigger limit, the handler will expire when it reaches this limit. Undefined means it can be triggered infinite times.
   */
  capacity: number | undefined;

  /**
   * Handler is whether an arrow function or not. Check it during registeration for further use.
   */
  isArrowFunctionHandler: boolean;
};
