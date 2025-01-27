type EventHandler = (...args: any[]) => void;

type EventName = string;

type EventConfig = {
  handler: EventHandler;
  capacity: number | undefined;
};

class EventBus {
  private readonly eventMap: Map<EventName, Set<EventConfig>>;

  constructor() {
    this.eventMap = new Map();
  }

  private getConfigs(eventName: EventName): Set<EventConfig>[] {
    const matchedConfigs: Set<EventConfig>[] = [];
    for (const en of this.eventMap.keys()) {
      // eventName is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      // 在注册时保证不会出现特殊情况
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        if (eventName.match(reg)) {
          // for of .keys() garuantees its existance
          // 这是key值提取的，一定存在
          const c = this.eventMap.get(en)!;
          matchedConfigs.push(c);
        }
      } else if (en === eventName) {
        const c = this.eventMap.get(en)!;
        matchedConfigs.push(c);
      }
    }
    return matchedConfigs;
  }

  private getExactConfigs(eventName: EventName): Set<EventConfig> | undefined {
    return this.eventMap.get(eventName);
  }

  private register(eventName: EventName, handler: EventHandler, capacity?: number) {
    let configs: Set<EventConfig> | undefined = this.eventMap.get(eventName);

    if (configs === undefined) {
      configs = new Set();
      this.eventMap.set(eventName, configs);
    }

    // See if the same name-handler tuple is already existed, log warning message if so.
    // 判断要绑定的函数是否已经在这个事件下存在，存在就warn
    let existConfig: EventConfig | undefined = undefined;

    for (const c of configs.values()) {
      if (c.handler === handler) {
        existConfig = c;
        break;
      }
    }

    if (existConfig !== undefined) {
      console.warn(
        `[TS-Event-Hub] This handler function is already existed under the event '${eventName}', it will not be registered again and only the capacity will be updated`
      );
      existConfig.capacity = capacity;
    } else {
      configs.add({
        handler,
        capacity,
      });
    }
  }

  public on(eventName: EventName, handler: EventHandler, capacity?: number) {
    this.register(eventName, handler, capacity);
  }

  public once(eventName: EventName, handler: EventHandler) {
    this.register(eventName, handler, 1);
  }

  public off(eventName: EventName, handler?: EventHandler) {
    if (handler) {
      const configs = this.getExactConfigs(eventName);
      if (configs === undefined) {
        return;
      }

      // The register function has garuanteed that there will be no duplicated name-handler tuple.
      // 在注册事件时此处已经保证了不会有重复的name-handler
      configs.forEach((c, v, s) => {
        if (c.handler === handler) {
          s.delete(c);
        }
      });
    } else {
      this.eventMap.delete(eventName);
    }
  }

  public emit(eventName: EventName, ...args: any) {
    this.emitWithThisArg(eventName, undefined, ...args);
  }

  public emitWithThisArg(eventName: EventName, thisArg: any, ...args: any) {
    const call = thisArg
      ? (config: EventConfig) => config.handler.call(thisArg, ...args)
      : (config: EventConfig) => config.handler(...args);

    const configSets: Set<EventConfig>[] = this.getConfigs(eventName);
    for (const configs of configSets) {
      configs.forEach((c, v, s) => {
        call(c);
        if (c.capacity !== undefined) {
          c.capacity--;
          if (c.capacity <= 0) {
            s.delete(c);
          }
        }
      });
    }
  }

  public logEventMaps() {
    console.log(`[TS-Event-Hub] All events lies below`, this.eventMap);
  }
}

export { EventBus };
