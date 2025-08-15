export class E extends Error {
  constructor(message: string) {
    super(message);
    this.name = '__NAME__';
  }
}

export function expect(o: unknown, msg: string): asserts o {
  if (!o) {
    throw new E(msg);
  }
}

export const enum ErrMsg {
  InvalidEventName = `When 'event' includes '*', there must be a '.' before or after it. e.g. 'user.*', '*.end'. not allowed: 'user*', 'eve*nt'`,
}
