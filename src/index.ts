import {
    SW_EVENT_PUSH,
    SW_EVENT_SYNC,
    SW_EVENT_ERROR,
    SW_EVENT_FETCH,
    SW_EVENT_INSTALL,
    SW_EVENT_MESSAGE,
    SW_EVENT_ACTIVATE,
    SW_EVENT_PERIODICSYNC,
    SW_EVENT_MESSAGEERROR,
    SW_EVENT_REJECTIONHANDLED,
    SW_EVENT_UNHANDLEDREJECTION,
} from '@budarin/http-constants';

export enum ServiceWorkerErrorType {
    ERROR = 'error',
    PLUGIN_ERROR = 'plugin_error',
    MESSAGE_ERROR = 'messageerror',
    REJECTION_HANDLED = 'rejectionhandled',
    UNHANDLED_REJECTION = 'unhandledrejection',
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
    trace: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
}

/** Базовый контекст, передаётся во все обработчики плагинов вторым аргументом. Без onError — он используется только библиотекой. */
export interface PluginContext {
    logger?: Logger;
}

/** Опции инициализации: контекст для плагинов + onError для библиотеки (в плагины не передаётся). */
export interface ServiceWorkerInitOptions extends PluginContext {
    onError?: (
        error: Error | unknown,
        event: Event,
        errorType?: ServiceWorkerErrorType
    ) => void;
}

/** Объект для показа push-уведомления: то, что принимает Notification API. Возвращается из обработчика push; библиотека вызывает showNotification. */
export type PushNotificationPayload = { title: string } & NotificationOptions;

let serviceWorkerInitialized = false;

/** Сбрасывает состояние инициализации (только для тестов). */
export function __resetServiceWorkerState(): void {
    serviceWorkerInitialized = false;
}

/** Тип контекста, требуемого плагином (извлекается из ServiceWorkerPlugin<C>). */
export type ContextOfPlugin<P> =
    P extends ServiceWorkerPlugin<infer C> ? C : PluginContext;

/** Юнион типов контекстов превращается в пересечение (все поля обязательны). */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/** Требуемый тип options по массиву плагинов (пересечение контекстов). P — кортеж плагинов, контекст выводится из каждого. */
export type RequiredOptions<P extends readonly unknown[]> =
    UnionToIntersection<ContextOfPlugin<P[number]>>;

interface ServiceWorkerEventHandlers<C extends PluginContext = PluginContext> {
    install?: (
        event: ExtendableEvent,
        context: C
    ) => void | Promise<void>;
    activate?: (
        event: ExtendableEvent,
        context: C
    ) => void | Promise<void>;
    fetch?: (
        event: FetchEvent,
        context: C
    ) => Promise<Response | undefined>;
    message?: (event: SwMessageEvent, context: C) => void;
    sync?: (event: SyncEvent, context: C) => Promise<void>;
    periodicsync?: (event: PeriodicSyncEvent, context: C) => Promise<void>;
    push?: (
        event: PushEvent,
        context: C
    ) => void | PushNotificationPayload | Promise<void | PushNotificationPayload>;
}

export interface ServiceWorkerPlugin<C extends PluginContext = PluginContext>
    extends ServiceWorkerEventHandlers<C> {
    name: string;
    order?: number;
}


/** @deprecated Используйте ServiceWorkerInitOptions. Оставлено для обратной совместимости. */
export type ServiceWorkerConfig = ServiceWorkerInitOptions;
export type FetchResponse = Promise<Response | undefined>;

type InstallHandler<C extends PluginContext> = (
    event: ExtendableEvent,
    context: C
) => void | Promise<void>;
type ActivateHandler<C extends PluginContext> = (
    event: ExtendableEvent,
    context: C
) => void | Promise<void>;
type FetchHandler<C extends PluginContext> = (
    event: FetchEvent,
    context: C
) => FetchResponse;
type MessageHandler<C extends PluginContext> = (
    event: SwMessageEvent,
    context: C
) => void;
type SyncHandler<C extends PluginContext> = (
    event: SyncEvent,
    context: C
) => Promise<void>;
type PeriodicsyncHandler<C extends PluginContext> = (
    event: PeriodicSyncEvent,
    context: C
) => Promise<void>;
type PushHandler<C extends PluginContext> = (
    event: PushEvent,
    context: C
) => void | PushNotificationPayload | Promise<void | PushNotificationPayload>;

export function createEventHandlers<C extends PluginContext>(
    plugins: readonly ServiceWorkerPlugin<C>[],
    options: C & ServiceWorkerInitOptions
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
        install: [] as InstallHandler<C>[],
        activate: [] as ActivateHandler<C>[],
        fetch: [] as FetchHandler<C>[],
        message: [] as MessageHandler<C>[],
        sync: [] as SyncHandler<C>[],
        periodicsync: [] as PeriodicsyncHandler<C>[],
        push: [] as PushHandler<C>[],
    };

    const logger = options.logger ?? console;

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
        if (plugin.install) handlers.install.push(plugin.install as InstallHandler<C>);
        if (plugin.activate) handlers.activate.push(plugin.activate as ActivateHandler<C>);
        if (plugin.fetch) handlers.fetch.push(plugin.fetch as FetchHandler<C>);
        if (plugin.message) handlers.message.push(plugin.message as MessageHandler<C>);
        if (plugin.sync) handlers.sync.push(plugin.sync as SyncHandler<C>);
        if (plugin.periodicsync)
            handlers.periodicsync.push(plugin.periodicsync as PeriodicsyncHandler<C>);
        if (plugin.push) handlers.push.push(plugin.push as PushHandler<C>);
    });

    return {
        install: (event: ExtendableEvent): void => {
            event.waitUntil(
                Promise.all(
                    handlers.install.map((handler) =>
                        Promise.resolve()
                            .then(() => handler(event, options))
                            .catch((error: unknown) =>
                                options.onError?.(
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
                        Promise.resolve()
                            .then(() => handler(event, options))
                            .catch((error: unknown) =>
                                options.onError?.(
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
                            const result = await handler(event, options);
                            if (result !== undefined) {
                                return result;
                            }
                        } catch (error) {
                            options.onError?.(
                                error as Error,
                                event,
                                ServiceWorkerErrorType.PLUGIN_ERROR
                            );
                        }
                    }
                    try {
                        return await fetch(event.request);
                    } catch (error) {
                        // Офлайн или сетевая ошибка — не оставляем promise в respondWith rejected
                        options.onError?.(error as Error, event, ServiceWorkerErrorType.PLUGIN_ERROR);
                        return new Response('', {
                            status: 503,
                            statusText: 'Service Unavailable',
                        });
                    }
                })()
            );
        },

        message: (event: SwMessageEvent): void => {
            handlers.message.forEach((handler) => {
                try {
                    handler(event, options);
                } catch (error) {
                    options.onError?.(
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
                        Promise.resolve()
                            .then(() => handler(event, options))
                            .catch((error: unknown) =>
                                options.onError?.(
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
                        Promise.resolve()
                            .then(() => handler(event, options))
                            .catch((error: unknown) =>
                                options.onError?.(
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
                            const result = await Promise.resolve(
                                handler(event, options)
                            );
                            if (
                                result != null &&
                                typeof result === 'object' &&
                                !Array.isArray(result)
                            ) {
                                if (
                                    'title' in result &&
                                    typeof (result as { title: unknown }).title ===
                                        'string'
                                ) {
                                    const { title, ...opts } = result as {
                                        title: string;
                                    } & Record<string, unknown>;
                                    await self.registration.showNotification(
                                        title,
                                        opts
                                    );
                                    return;
                                }
                                return;
                            }
                        } catch (error) {
                            options.onError?.(
                                error as Error,
                                event,
                                ServiceWorkerErrorType.PLUGIN_ERROR
                            );
                        }
                    }

                    // Fallback: ни один плагин не вернул payload — показать из event.data или по умолчанию
                    try {
                        const data = event.data;
                        if (!data) return;

                        let payload: unknown;
                        try {
                            payload = await data.json();
                        } catch {
                            const text = await data.text();
                            payload =
                                text.length > 0 ? { title: text } : null;
                        }
                        if (payload == null) return;
                        const withTitle =
                            typeof payload === 'object' &&
                            payload !== null &&
                            'title' in payload &&
                            typeof (payload as { title: unknown }).title ===
                                'string'
                                ? (payload as {
                                      title: string;
                                  } & Record<string, unknown>)
                                : { title: 'Уведомление' };
                        const { title, ...opts } = withTitle;
                        await self.registration.showNotification(title, opts);
                    } catch (error) {
                        options.onError?.(
                            error as Error,
                            event,
                            ServiceWorkerErrorType.PLUGIN_ERROR
                        );
                    }
                })()
            );
        },

        error: (event: ErrorEvent): void => {
            try {
                options.onError?.(
                    event.error,
                    event,
                    ServiceWorkerErrorType.ERROR
                );
            } catch (error) {
                logger.error('Error in error handler:', error);
            }
        },

        messageerror: (event: MessageEvent): void => {
            try {
                options.onError?.(
                    event.data,
                    event,
                    ServiceWorkerErrorType.MESSAGE_ERROR
                );
            } catch (error) {
                logger.error('Error in messageerror handler:', error);
            }
        },

        unhandledrejection: (event: PromiseRejectionEvent): void => {
            try {
                options.onError?.(
                    event.reason,
                    event,
                    ServiceWorkerErrorType.UNHANDLED_REJECTION
                );
            } catch (error) {
                logger.error('Error in unhandledrejection handler:', error);
            }
        },

        rejectionhandled: (event: PromiseRejectionEvent): void => {
            try {
                options.onError?.(
                    event.reason,
                    event,
                    ServiceWorkerErrorType.REJECTION_HANDLED
                );
            } catch (error) {
                logger.error('Error in rejectionhandled handler:', error);
            }
        },
    };
}

export function initServiceWorker<P extends readonly unknown[]>(
    plugins: P,
    options: RequiredOptions<P> & ServiceWorkerInitOptions
): void {
    if (serviceWorkerInitialized) {
        return;
    }
    serviceWorkerInitialized = true;

    const opts = { ...options, logger: options.logger ?? console };

    const names = new Set<string>();
    for (const plugin of plugins as readonly ServiceWorkerPlugin<PluginContext>[]) {
        if (names.has(plugin.name)) {
            opts.logger.warn(`Duplicate plugin name: "${plugin.name}"`);
        }
        names.add(plugin.name);
    }

    const handlers = createEventHandlers(
        plugins as readonly ServiceWorkerPlugin<PluginContext>[],
        opts as PluginContext
    );

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
