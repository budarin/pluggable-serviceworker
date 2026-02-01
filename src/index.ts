import {
    SW_EVENT_ACTIVATE,
    SW_EVENT_ERROR,
    SW_EVENT_FETCH,
    SW_EVENT_INSTALL,
    SW_EVENT_MESSAGE,
    SW_EVENT_MESSAGEERROR,
    SW_EVENT_PERIODICSYNC,
    SW_EVENT_PUSH,
    SW_EVENT_REJECTIONHANDLED,
    SW_EVENT_SYNC,
    SW_EVENT_UNHANDLEDREJECTION,
} from '@budarin/http-constants';

export enum ServiceWorkerErrorType {
    ERROR = 'error',
    MESSAGE_ERROR = 'messageerror',
    UNHANDLED_REJECTION = 'unhandledrejection',
    REJECTION_HANDLED = 'rejectionhandled',
    PLUGIN_ERROR = 'plugin_error',
}

interface SyncEvent extends ExtendableEvent {
    readonly tag: string;
    readonly lastChance: boolean;
}

interface PeriodicSyncEvent extends ExtendableEvent {
    readonly tag: string;
}

declare global {
    interface ServiceWorkerGlobalScopeEventMap {
        sync: SyncEvent;
        periodicsync: PeriodicSyncEvent;
    }
}

export interface SwMessageEvent extends Omit<ExtendableMessageEvent, 'data'> {
    data: {
        type: string;
    };
}

export interface Logger {
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
}

const sw = self as unknown as ServiceWorkerGlobalScope & {
    logger: Logger;
};

let serviceWorkerInitialized = false;

interface ServiceWorkerEventHandlers {
    install?: (event: ExtendableEvent) => void | Promise<void>;
    activate?: (event: ExtendableEvent) => void | Promise<void>;
    fetch?: (event: FetchEvent) => Promise<Response | undefined>;
    message?: (event: SwMessageEvent) => void;
    sync?: (event: SyncEvent) => Promise<void>;
    periodicsync?: (event: PeriodicSyncEvent) => Promise<void>;
    push?: (event: PushEvent) => void | Promise<void>;
}

export interface ServiceWorkerPlugin extends ServiceWorkerEventHandlers {
    name: string;
    order?: number;
}

export interface ServiceWorkerConfig {
    logger?: Logger;
    onError?: (
        error: Error | unknown,
        event: Event,
        errorType?: ServiceWorkerErrorType
    ) => void;
}

export type FetchResponse = Promise<Response | undefined>;

export function createEventHandlers(
    plugins: ServiceWorkerPlugin[],
    config: ServiceWorkerConfig
): {
    install: (event: ExtendableEvent) => void;
    activate: (event: ExtendableEvent) => void;
    fetch: (event: FetchEvent) => void;
    message: (event: SwMessageEvent) => void;
    sync: (event: SyncEvent) => void;
    periodicsync: (event: PeriodicSyncEvent) => void;
    push: (event: PushEvent) => void;
    error: (event: ErrorEvent) => void;
    messageerror: (event: MessageEvent) => void;
    unhandledrejection: (event: PromiseRejectionEvent) => void;
    rejectionhandled: (event: PromiseRejectionEvent) => void;
} {
    const handlers = {
        install: [] as ((event: ExtendableEvent) => void | Promise<void>)[],
        activate: [] as ((event: ExtendableEvent) => void | Promise<void>)[],
        fetch: [] as ((event: FetchEvent) => FetchResponse)[],
        message: [] as ((event: SwMessageEvent) => void)[],
        sync: [] as ((event: SyncEvent) => Promise<void>)[],
        periodicsync: [] as ((event: PeriodicSyncEvent) => Promise<void>)[],
        push: [] as ((event: PushEvent) => void | Promise<void>)[],
    };

    // Сортировка плагинов по порядку выполнения:
    // 1. Сначала выполняются ВСЕ плагины без order (undefined) в том порядке, в котором они были добавлены
    // 2. Затем выполняются плагины с order в порядке возрастания значений order
    const sortedPlugins = [
        ...plugins.filter((plugin) => plugin.order === undefined),
        ...plugins
            .filter((plugin) => plugin.order !== undefined)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    ];

    sortedPlugins.forEach((plugin) => {
        if (plugin.install) handlers.install.push(plugin.install);
        if (plugin.activate) handlers.activate.push(plugin.activate);
        if (plugin.fetch) handlers.fetch.push(plugin.fetch);
        if (plugin.message) handlers.message.push(plugin.message);
        if (plugin.sync) handlers.sync.push(plugin.sync);
        if (plugin.periodicsync)
            handlers.periodicsync.push(plugin.periodicsync);
        if (plugin.push) handlers.push.push(plugin.push);
    });

    return {
        install: (event: ExtendableEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.install.map((handler) =>
                        Promise.resolve(handler(event)).catch(
                            (error: unknown) =>
                                config.onError?.(
                                    error as Error,
                                    event,
                                    ServiceWorkerErrorType.PLUGIN_ERROR
                                )
                        )
                    )
                )
            );
        },

        activate: (event: ExtendableEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.activate.map((handler) =>
                        Promise.resolve(handler(event)).catch(
                            (error: unknown) =>
                                config.onError?.(
                                    error as Error,
                                    event,
                                    ServiceWorkerErrorType.PLUGIN_ERROR
                                )
                        )
                    )
                )
            );
        },

        fetch: (event: FetchEvent): void => {
            event.respondWith(
                (async (): Promise<Response> => {
                    for (const handler of handlers.fetch) {
                        try {
                            const result = await handler(event);
                            if (result !== undefined) {
                                return result;
                            }
                        } catch (error) {
                            config.onError?.(
                                error as Error,
                                event,
                                ServiceWorkerErrorType.PLUGIN_ERROR
                            );
                        }
                    }
                    return fetch(event.request);
                })()
            );
        },

        message: (event: SwMessageEvent): void => {
            handlers.message.forEach((handler) => {
                try {
                    handler(event);
                } catch (error) {
                    config.onError?.(
                        error as Error,
                        event,
                        ServiceWorkerErrorType.PLUGIN_ERROR
                    );
                }
            });
        },

        sync: (event: SyncEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.sync.map((handler) =>
                        Promise.resolve(handler(event)).catch(
                            (error: unknown) =>
                                config.onError?.(
                                    error as Error,
                                    event,
                                    ServiceWorkerErrorType.PLUGIN_ERROR
                                )
                        )
                    )
                )
            );
        },

        periodicsync: (event: PeriodicSyncEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.periodicsync.map((handler) =>
                        Promise.resolve(handler(event)).catch(
                            (error: unknown) =>
                                config.onError?.(
                                    error as Error,
                                    event,
                                    ServiceWorkerErrorType.PLUGIN_ERROR
                                )
                        )
                    )
                )
            );
        },

        push: (event: PushEvent): void => {
            event.waitUntil(
                (async (): Promise<void> => {
                    for (const handler of handlers.push) {
                        try {
                            await Promise.resolve(handler(event));
                        } catch (error) {
                            config.onError?.(
                                error as Error,
                                event,
                                ServiceWorkerErrorType.PLUGIN_ERROR
                            );
                        }
                    }
                })()
            );
        },

        error: (event: ErrorEvent): void => {
            try {
                config.onError?.(
                    event.error,
                    event,
                    ServiceWorkerErrorType.ERROR
                );
            } catch (error) {
                (sw.logger ?? console).error('Error in error handler:', error);
            }
        },

        messageerror: (event: MessageEvent): void => {
            try {
                config.onError?.(
                    event.data,
                    event,
                    ServiceWorkerErrorType.MESSAGE_ERROR
                );
            } catch (error) {
                (sw.logger ?? console).error(
                    'Error in messageerror handler:',
                    error
                );
            }
        },

        unhandledrejection: (event: PromiseRejectionEvent): void => {
            try {
                config.onError?.(
                    event.reason,
                    event,
                    ServiceWorkerErrorType.UNHANDLED_REJECTION
                );
            } catch (error) {
                (sw.logger ?? console).error(
                    'Error in unhandledrejection handler:',
                    error
                );
            }
        },

        rejectionhandled: (event: PromiseRejectionEvent): void => {
            try {
                config.onError?.(
                    event.reason,
                    event,
                    ServiceWorkerErrorType.REJECTION_HANDLED
                );
            } catch (error) {
                (sw.logger ?? console).error(
                    'Error in rejectionhandled handler:',
                    error
                );
            }
        },
    };
}

export function initServiceWorker(
    plugins: ServiceWorkerPlugin[],
    config?: ServiceWorkerConfig
): void {
    if (serviceWorkerInitialized) {
        return;
    }
    serviceWorkerInitialized = true;

    sw.logger = config?.logger ?? console;

    const names = new Set<string>();
    for (const plugin of plugins) {
        if (names.has(plugin.name)) {
            (sw.logger ?? console).warn(
                `Duplicate plugin name: "${plugin.name}"`
            );
        }
        names.add(plugin.name);
    }

    const handlers = createEventHandlers(plugins, config ?? {});

    // Регистрируем глобальные обработчики ошибок
    self.addEventListener(SW_EVENT_ERROR, handlers.error);
    self.addEventListener(SW_EVENT_MESSAGEERROR, handlers.messageerror);
    self.addEventListener(
        SW_EVENT_UNHANDLEDREJECTION,
        handlers.unhandledrejection
    );
    self.addEventListener(SW_EVENT_REJECTIONHANDLED, handlers.rejectionhandled);

    // Регистрируем стандартные обработчики событий Service Worker
    self.addEventListener(SW_EVENT_INSTALL, handlers.install);
    self.addEventListener(SW_EVENT_ACTIVATE, handlers.activate);
    self.addEventListener(SW_EVENT_FETCH, handlers.fetch);
    self.addEventListener(SW_EVENT_MESSAGE, handlers.message);
    self.addEventListener(SW_EVENT_SYNC, handlers.sync);
    self.addEventListener(SW_EVENT_PERIODICSYNC, handlers.periodicsync);
    self.addEventListener(SW_EVENT_PUSH, handlers.push);
}
