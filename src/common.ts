class E extends Error {
  constructor(message: string) {
    super(message);
    this.name = '__NAME__';
  }
}

export const isSafeInteger = Number.isSafeInteger;

export function expect(o: unknown, msg: string): asserts o {
  if (!o) {
    throw new E(msg);
  }
}

/**
 * When emitting
 * 1. name must not contain `*`
 * 2. name must not start or end with `.`
 */
export function expectEmitEventName(name: unknown) {
  if (typeof name !== 'string') {
    return;
  }

  if (name.startsWith('.') || name.endsWith('.')) {
    throw new E(`'identifier' cannot start or end with '.'`);
  }

  if (name.includes('*')) {
    throw new E(`When registering, 'identifier' must not contains '*'`);
  }
}

/**
 * When registering
 * - allowed: user.*, order.*
 * - not allowed: *user, user*, us*er, evt.***
 */
export function expectEventName(raw: EventIdentifier) {
  if (typeof raw !== 'string') {
    return;
  }

  // rule: cannot start or end with '.'
  if (raw.startsWith('.') || raw.endsWith('.')) {
    throw new E(`'identifier' cannot start or end with '.'`);
  }

  if (/[\*]{3,}/g.test(raw)) {
    throw new E(`'identifier' cannot have more than two '*' in a row`);
  }

  // normalize multiple '**' to single '*'
  const name = raw.replace(/[\*]{2,}/g, '*');

  // rule: must has '.' before or after '*'
  const index = name.indexOf('*');
  if (index === -1) {
    return;
  }
  if (index === 0) {
    if (name.length === 1) {
      throw new E(`'identifier' cannot be '*'`);
    }
    if (name[index + 1] !== '.') {
      throw new E(ErrMsg.InvalidEventName);
    }
  }

  // & Then index > 0
  if (name[index - 1] !== '.' && name[index + 1] !== '.') {
    throw new E(ErrMsg.InvalidEventName);
  }
}

export const enum ErrMsg {
  InvalidEventName = `When 'identifier' includes '*', there must be a '.' before or after it. e.g. 'user.*', '*.end'. not allowed: 'user*', 'eve*nt'`,
}
