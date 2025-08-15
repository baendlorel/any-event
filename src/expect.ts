class E extends Error {
  constructor(message: string) {
    super(message);
    this.name = '__NAME__';
  }
}

const enum ErrMsg {
  InvalidEventName = `When 'identifier' includes '*', there must be a '.' before or after it. e.g. 'user.*', '*.end'. not allowed: 'user*', 'eve*nt'`,
}

class UntypedExpect extends Function {
  private readonly validIdentifiers = new Set<string>(['']);

  constructor() {
    super('o', 'msg', `if (!o){const e=Error(msg);e.name='__NAME__';throw e;}`);
  }

  /**
   * When emitting
   * 1. name must not contain `*`
   * 2. name must not start or end with `.`
   */
  emitIdentifier(name: unknown) {
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
  identifier(raw: EventIdentifier) {
    if (typeof raw !== 'string') {
      return;
    }

    if (this.validIdentifiers.has(raw)) {
      return;
    }

    // rule: cannot start or end with '.'
    if (raw.startsWith('.') || raw.endsWith('.')) {
      throw new E(`'identifier' cannot start or end with '.'`);
    }

    if (/[\*]{3,}/g.test(raw)) {
      throw new E(`'identifier' cannot have more than two '*' in a row`);
    }

    if (raw === '*' || raw === '**') {
      throw new E(`'identifier' cannot be '*' or '**', it is meaningless`);
    }

    const doubleStarIndex = raw.indexOf('**');
    if (doubleStarIndex !== -1) {
      if (doubleStarIndex !== raw.length - 2) {
        throw new E(`When using '**', it must be at the end of the identifier.`);
      }

      // & here length will not be 0(returned above), 1(indexOf** != -1), 2(!= **)
      // & so length is at least 3
      if (raw[doubleStarIndex - 1] !== '.') {
        throw new E(`When using '**', there must be a '.' before it.`);
      }

      if (/[^*]\*[^*]/g.test(raw)) {
        throw new E(`'**' and '*' cannot be used at the same time.`);
      }
    }

    // normalize multiple '**' to single '*'
    const name = raw.replace(/[\*]{2,}/g, '*');

    // rule: must has '.' before or after '*'
    // & after assertions above, name could not be only '*' or '**' shrunk to '*'
    // & if name contains '*', name.length must be at least 2
    for (let index = 0; index < name.length; index++) {
      if (name[index] !== '*') {
        continue;
      }
      if (index === 0) {
        if (name[1] !== '.') {
          throw new E(ErrMsg.InvalidEventName);
        }
        continue;
      }

      if (index === name.length - 1) {
        if (name[name.length - 2] !== '.') {
          throw new E(ErrMsg.InvalidEventName);
        }
        continue;
      }

      // & here, name.length is at least 3
      if (name[index - 1] !== '.' && name[index + 1] !== '.') {
        throw new E(ErrMsg.InvalidEventName);
      }
    }

    this.validIdentifiers.add(raw);
  }
}

type Expect = UntypedExpect & ((o: unknown, msg: string) => asserts o);

export const expect: Expect = new UntypedExpect() as Expect;
