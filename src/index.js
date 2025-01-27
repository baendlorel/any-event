"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    constructor() {
        this.eventMap = new Map();
    }
    getConfigs(eventName) {
        const matchedConfigs = [];
        for (const en of this.eventMap.keys()) {
            // eventName is checked during the registration, here we only consider names end with '.*' or includes '.*.'
            // 在注册时保证不会出现特殊情况
            if (en.includes('.*')) {
                const t = en.replace(/\.\*\./g, '.[^.]+.').replace(/\.\*$/g, '.[^.]+');
                const reg = new RegExp(t, 'g');
                if (eventName.match(reg)) {
                    // for of .keys() garuantees its existance
                    // 这是key值提取的，一定存在
                    const c = this.eventMap.get(en);
                    matchedConfigs.push(c);
                }
            }
        }
        return matchedConfigs;
    }
    getExactConfigs(eventName) {
        return this.eventMap.get(eventName);
    }
    register(eventName, handler, capacity) {
        let configs = this.eventMap.get(eventName);
        if (configs === undefined) {
            configs = new Set();
            this.eventMap.set(eventName, configs);
        }
        // See if the same name-handler tuple is already existed, log warning message if so.
        // 判断要绑定的函数是否已经在这个事件下存在，存在就warn
        let existConfig = undefined;
        for (const c of configs.values()) {
            if (c.handler === handler) {
                existConfig = c;
                break;
            }
        }
        if (existConfig !== undefined) {
            console.warn(`[TS-Event-Hub] This handler function is already existed under the event '${eventName}', it will not be registered again and only the capacity will be updated`);
            existConfig.capacity = capacity;
        }
        else {
            configs.add({
                handler,
                capacity,
            });
        }
    }
    on(eventName, handler, capacity) {
        this.register(eventName, handler, capacity);
    }
    once(eventName, handler) {
        this.register(eventName, handler, 1);
    }
    off(eventName, handler) {
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
        }
        else {
            this.eventMap.delete(eventName);
        }
    }
    emit(eventName, ...args) {
        this.emitWithThisArg(eventName, undefined, ...args);
    }
    emitWithThisArg(eventName, thisArg, ...args) {
        const call = thisArg
            ? (config) => config.handler.call(thisArg, ...args)
            : (config) => config.handler(...args);
        const configSets = this.getConfigs(eventName);
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
    logEventMaps() {
        console.log(`[TS-Event-Hub] All events lies below`);
        console.log(this.eventMap);
    }
}
exports.EventBus = EventBus;
