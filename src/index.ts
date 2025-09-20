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

// Extend ServiceWorkerGlobalScope to include sync events
declare global {
    interface ServiceWorkerGlobalScopeEventMap {
        sync: SyncEvent;
        periodicsync: PeriodicSyncEvent;
    }
}

interface ServiceWorkerEventHandlers {
    install?: (event: ExtendableEvent) => void | Promise<void>;
    activate?: (event: ExtendableEvent) => void | Promise<void>;
    fetch?: (event: FetchEvent) => Promise<Response | null>;
    message?: (event: MessageEvent) => void;
    sync?: (event: SyncEvent) => void | Promise<void>;
    periodicsync?: (event: PeriodicSyncEvent) => void | Promise<void>;
    push?: (event: PushEvent) => void | Promise<void>;
}

interface ServiceWorkerPlugin extends ServiceWorkerEventHandlers {
    name: string;
    priority?: number;
}

interface ServiceWorkerConfig {
    plugins?: ServiceWorkerPlugin[];
    onError?: (
        error: Error | any,
        event: Event,
        errorType?: ServiceWorkerErrorType
    ) => void;
}

type FetchResponse = Promise<Response | null>;

export function createEventHandlers(
    plugins: ServiceWorkerPlugin[],
    config: ServiceWorkerConfig = {}
): {
    install: (event: ExtendableEvent) => void;
    activate: (event: ExtendableEvent) => void;
    fetch: (event: FetchEvent) => void;
    message: (event: MessageEvent) => void;
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
        message: [] as ((event: MessageEvent) => void)[],
        sync: [] as ((event: SyncEvent) => void | Promise<void>)[],
        periodicsync: [] as ((
            event: PeriodicSyncEvent
        ) => void | Promise<void>)[],
        push: [] as ((event: PushEvent) => void | Promise<void>)[],
    };

    // Здесь происходит сортировка плагинов по их приоритету.
    // Сначала выбираются плагины, у которых явно указан priority (plugin.priority !== undefined),
    // затем они сортируются по возрастанию этого значения (меньший priority — выше в списке).
    // После отсортированных по приоритету плагинов добавляются все остальные плагины,
    // у которых priority не указан (plugin.priority === undefined), сохраняя их исходный порядок.
    const sortedPlugins = [
        ...plugins
            .filter((plugin) => plugin.priority !== undefined)
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
        ...plugins.filter((plugin) => plugin.priority === undefined),
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
                            if (result) {
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

        message: (event: MessageEvent): void => {
            handlers.message.forEach((handler) => {
                try {
                    handler(event);
                } catch (error) {
                    config.onError?.(error as Error, event);
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
                console.error('Error in error handler:', error);
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
                console.error('Error in messageerror handler:', error);
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
                console.error('Error in unhandledrejection handler:', error);
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
                console.error('Error in rejectionhandled handler:', error);
            }
        },
    };
}

export function initializeServiceWorker(
    plugins: ServiceWorkerPlugin[],
    config?: ServiceWorkerConfig
): void {
    const handlers = createEventHandlers(plugins, config);

    // Регистрируем стандартные обработчики событий Service Worker
    self.addEventListener('install', handlers.install);
    self.addEventListener('activate', handlers.activate);
    self.addEventListener('fetch', handlers.fetch);
    self.addEventListener('message', handlers.message);
    self.addEventListener('sync', handlers.sync);
    self.addEventListener('periodicsync', handlers.periodicsync);
    self.addEventListener('push', handlers.push);

    // Регистрируем глобальные обработчики ошибок
    self.addEventListener('error', handlers.error);
    self.addEventListener('messageerror', handlers.messageerror);
    self.addEventListener('unhandledrejection', handlers.unhandledrejection);
    self.addEventListener('rejectionhandled', handlers.rejectionhandled);
}
