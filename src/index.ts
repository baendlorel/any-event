type EventHandler = (...args: any[]) => void;

type EventName = string;

type EventConfig = {
  handler: EventHandler;
  capacity: number | null;
};

class EventBus {
  private readonly eventMap: Map<EventName, Set<EventConfig>>;

  constructor() {
    this.eventMap = new Map();
  }

  private getConfigs(eventName: EventName) {
    // TODO 添加通配符支持
    return this.eventMap.get(eventName);
  }

  private getExactConfigs(eventName: EventName) {
    return this.eventMap.get(eventName);
  }

  private register(eventName: EventName, handler: EventHandler, capacity: number | null = null) {
    let configs: Set<EventConfig> | undefined = this.eventMap.get(eventName);

    if (configs === undefined) {
      configs = new Set();
      this.eventMap.set(eventName, configs);
    }

    // 判断要绑定的函数是否已经在这个事件下存在，存在就warn
    let existConfig: EventConfig | null = null;

    for (const c of configs.values()) {
      if (c.handler === handler) {
        existConfig = c;
        break;
      }
    }

    if (existConfig !== null) {
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

  public on(eventName: EventName, handler: EventHandler, capacity: number | null = null) {
    this.register(eventName, handler, capacity);
  }

  public once(eventName: EventName, handler: EventHandler) {
    this.register(eventName, handler, 1);
  }

  public off(eventName: EventName, handler?: EventHandler) {
    if (handler) {
      const configs = this.getExactConfigs(eventName);

      if (!configs) {
        return;
      }

      // The register function has garuanteed that there will be no duplicated name-handler
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

  public emitWithThisArg(eventName: EventName, thisArg: any, ...args: any) {
    let configs: Set<EventConfig> | undefined = this.getConfigs(eventName);

    if (!configs) {
      return;
    }

    const call = thisArg
      ? (config: EventConfig) => config.handler.call(thisArg, ...args)
      : (config: EventConfig) => config.handler(...args);

    const toDelete: Set<number> = new Set();

    configs.forEach((c, v, s) => {
      call(c);
      if (c.capacity !== null) {
        c.capacity--;
        if (c.capacity <= 0) {
          s.delete(c);
        }
      }
    });
  }

  public logEventMaps() {
    console.log(this.eventMap);
  }
}
