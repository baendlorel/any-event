/**
 * @name EventBus
 * @author Kasukabe Tsumugi <futami16237@gmail.com>
 * @license GPLv3
 */
/**
 * 事件处理器类型，普通的函数
 * Type of an event handler, it is just a normal function
 */
type EventHandler = (...args: any[]) => any;
/**
 * 事件总线类
 * Event Bus Class
 */
export default class EventBus {
    /**
     * 简易控制台，可以加日志
     * Logger with header '[TS-Event-Hub]'
     */
    private readonly logger;
    /**
     * 保存了所有注册的事件名到事件配置集合的映射。
     * Map of all registered eventName and set of eventConfigs.
     */
    private readonly eventMap;
    constructor();
    /**
     * 判断一个函数是否为箭头函数。
     * Check if a function is an arrow function.
     * @param fn
     * @returns
     */
    private isArrowFunction;
    /**
     * 用通配符匹配获取一个事件名称对应的所有配置集合。
     * Using wildcard to match all config sets of an eventName.
     * @param eventName 事件名
     * @returns
     */
    private getConfigs;
    /**
     * 使用“===”来匹配事件名，查找事件配置集合
     * Using "===" to find event configs set
     * @param eventName 事件名
     * @returns
     */
    private getExactConfigs;
    /**
     * 注册事件，事件名称不能使用前面不带.的*。
     * Register an event. Do not use names with '*' not come after '.'.
     * @param eventName 事件名 name of the event
     * @param handler 处理函数 dealer function
     * @param capacity 触发上限 trigger limit
     */
    private register;
    /**
     * 注册事件，事件名称不能使用前面不带.的*。
     * Register an event. Do not use names with '*' not come after '.'.
     * @param eventName 事件名 name of the event
     * @param handler 处理函数 dealer function
     * @param capacity 触发上限 trigger limit
     */
    on(eventName: string, handler: EventHandler, capacity?: number): void;
    /**
     * 注册只触发1次的事件，事件名称不能使用前面不带.的*。
     * Register an event that can only be triggered once. Do not use names with '*' not come after '.'.
     * @param eventName 事件名 name of the event
     * @param handler 处理函数 dealer function
     */
    once(eventName: string, handler: EventHandler): void;
    /**
     * 需要注意，此处的eventName必须精确，和注册时的一样，不会进行通配。例如注册了'evt.*'的话，必须还使用'evt.*'才能注销它，用'evt.a'是不行的
     * Note that we must use the precise eventName as it was registered. Like we registered 'evt.*', and use 'evt.a' will not turn it off.
     * @param eventName
     * @param handler
     * @returns
     */
    off(eventName: string, handler?: EventHandler): void;
    /**
     * 清除事件配置映射
     * Clear all event-config maps
     */
    clear(): void;
    /**
     * 触发事件，事件名不能带有*号。
     * Trigger an event by name. Not allow to use names includes '*'.
     * @param eventName
     * @param args
     */
    emit(eventName: string, ...args: any): void;
    /**
     * 触发事件，事件名不能带有*号。
     * 如果真的要改变this指向，那么不要使用箭头函数。
     * Trigger an event by name. Not allow to use names includes '*'.
     * If you want to change thisArg, do not use arrow functions.
     * @param eventName
     * @param thisArg
     * @param args
     */
    emitWithThisArg(eventName: string, thisArg: any, ...args: any): void;
    /**
     * 开启控制台日志
     */
    turnOnLog(): void;
    /**
     * 关闭控制台日志
     */
    turnOffLog(): void;
    /**
     * 在控制台打印整个eventMap，用来查看所有事件和其配置。
     * Log eventMap in console to see all the event configs.
     * @param forced 为真则在关闭日志的情况下也可以打印。 If true, it can log even if the log is closed.
     */
    logEventMaps(forced?: boolean): void;
}
export {};
