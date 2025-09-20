interface SyncEvent extends ExtendableEvent {
    readonly tag: string;
    readonly lastChance: boolean;
}

// Extend ServiceWorkerGlobalScope to include sync event
declare global {
    interface ServiceWorkerGlobalScopeEventMap {
        sync: SyncEvent;
    }
}

interface ServiceWorkerEventHandlers {
    install?: (event: ExtendableEvent) => void | Promise<void>;
    activate?: (event: ExtendableEvent) => void | Promise<void>;
    fetch?: (event: FetchEvent) => Promise<Response | null>;
    message?: (event: MessageEvent) => void;
    sync?: (event: SyncEvent) => void;
    push?: (event: PushEvent) => void;
}

interface ServiceWorkerPlugin extends ServiceWorkerEventHandlers {
    name: string;
    priority?: number;
}

interface ServiceWorkerConfig {
    plugins?: ServiceWorkerPlugin[];
    onError?: (error: Error, event: Event) => void;
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
    push: (event: PushEvent) => void;
} {
    const handlers = {
        install: [] as ((event: ExtendableEvent) => void | Promise<void>)[],
        activate: [] as ((event: ExtendableEvent) => void | Promise<void>)[],
        fetch: [] as ((event: FetchEvent) => FetchResponse)[],
        message: [] as ((event: MessageEvent) => void)[],
        sync: [] as ((event: SyncEvent) => void)[],
        push: [] as ((event: PushEvent) => void)[],
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
        if (plugin.push) handlers.push.push(plugin.push);
    });

    return {
        install: (event: ExtendableEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.install.map((handler) =>
                        Promise.resolve(handler(event)).catch(
                            (error: unknown) =>
                                config.onError?.(error as Error, event)
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
                                config.onError?.(error as Error, event)
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
                            config.onError?.(error as Error, event);
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
            handlers.sync.forEach((handler) => {
                handler(event);
            });
        },

        push: (event: PushEvent): void => {
            handlers.push.forEach((handler) => {
                handler(event);
            });
        },
    };
}

export function initializeServiceWorker(
    plugins: ServiceWorkerPlugin[],
    config?: ServiceWorkerConfig
): void {
    const handlers = createEventHandlers(plugins, config);

    self.addEventListener('install', handlers.install);
    self.addEventListener('activate', handlers.activate);
    self.addEventListener('fetch', handlers.fetch);
    self.addEventListener('message', handlers.message);
    self.addEventListener('sync', handlers.sync);
    self.addEventListener('push', handlers.push);
}
