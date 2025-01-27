type EventHandler = (...args: any[]) => void;

type EventName = string;

type EventConfig = {
  name: EventName;
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
      // 在注册时保证不会出现特殊情况
      // eventName is checked during the registration, here we only consider names end with '.*' or includes '.*.'
      if (en.includes('.*')) {
        const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
        const reg = new RegExp(t, 'g');
        if (eventName.match(reg)) {
          // 这是key值提取的，一定存在
          // for of .keys() garuantees its existance
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

    // 判断要绑定的函数是否已经在这个事件下存在，存在就warn
    // See if the same name-handler tuple is already existed, log warning message if so.
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
        name: eventName,
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

  /**
   * 需要注意，此处的eventName必须精确，和注册时的一样，不会进行通配。例如'evt.*'，这时候必须还使用'evt.*'才能注销它，用'evt.a'是不行的
   * Note that we must use the precise eventName as it was registered. Like we registered 'evt.*', and use 'evt.a' will not turn it off.
   * @param eventName
   * @param handler
   * @returns
   */
  public off(eventName: EventName, handler?: EventHandler) {
    if (handler) {
      const configs = this.getExactConfigs(eventName);
      if (configs === undefined) {
        return;
      }

      // 在注册事件时此处已经保证了不会有重复的name-handler
      // The register function has garuanteed that there will be no duplicated name-handler tuple.
      for (const c of configs.values()) {
        if (c.handler === handler) {
          configs.delete(c);
          break;
        }
      }

      if (configs.size === 0) {
        this.eventMap.delete(eventName);
      }
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

        // 如果删除事件后handler数量为0，则删除该事件
        // if this event has no handler after deletion, delete it.
        if (s.size === 0) {
          this.eventMap.delete(c.name);
        }
      });
    }
  }

  public logEventMaps() {
    console.log(`[TS-Event-Hub] All events lies below`, this.eventMap);
  }
}

export { EventBus };
