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
    SW_EVENT_BACKGROUNDFETCHFAIL,
    SW_EVENT_BACKGROUNDFETCHABORT,
    SW_EVENT_BACKGROUNDFETCHCLICK,
    SW_EVENT_BACKGROUNDFETCHSUCCESS,
} from '@budarin/http-constants/service-worker';

import {
    PLUGGABLE_SW_GET_VERSION,
    PLUGGABLE_SW_VERSION,
} from './constants/versionMessages.js';

import { SW_PING_PATH } from './constants/paths.js';

/** Error type identifiers for onError. Use const object instead of enum (see .cursor/rules/types.mdc). */
export const serviceWorkerErrorTypes = {
    ERROR: SW_EVENT_ERROR,
    /** Ошибка в плагине при обработке события install */
    INSTALL_ERROR: 'install_error',
    /** Ошибка в плагине при обработке события activate */
    ACTIVATE_ERROR: 'activate_error',
    /** Ошибка в плагине при обработке fetch или при сетевом запросе (офлайн) */
    FETCH_ERROR: 'fetch_error',
    /** Глобальное событие messageerror (например, ошибка structured clone) */
    MESSAGE_ERROR: SW_EVENT_MESSAGEERROR,
    /** Ошибка в плагине при обработке события message */
    MESSAGE_ERROR_HANDLER: 'message_error_handler',
    /** Ошибка в плагине при обработке события sync */
    SYNC_ERROR: 'sync_error',
    /** Ошибка в плагине при обработке события periodicsync */
    PERIODICSYNC_ERROR: 'periodicsync_error',
    /** Ошибка в плагине при обработке события push или при показе уведомления */
    PUSH_ERROR: 'push_error',
    /** Ошибка в плагине при обработке события backgroundfetchsuccess */
    BACKGROUNDFETCHSUCCESS_ERROR: 'backgroundfetchsuccess_error',
    /** Ошибка в плагине при обработке события backgroundfetchfail */
    BACKGROUNDFETCHFAIL_ERROR: 'backgroundfetchfail_error',
    /** Ошибка в плагине при обработке события backgroundfetchabort */
    BACKGROUNDFETCHABORT_ERROR: 'backgroundfetchabort_error',
    /** Ошибка в плагине при обработке события backgroundfetchclick */
    BACKGROUNDFETCHCLICK_ERROR: 'backgroundfetchclick_error',
    REJECTION_HANDLED: SW_EVENT_REJECTIONHANDLED,
    UNHANDLED_REJECTION: SW_EVENT_UNHANDLEDREJECTION,
} as const;

export type ServiceWorkerErrorType =
    (typeof serviceWorkerErrorTypes)[keyof typeof serviceWorkerErrorTypes];

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
        backgroundfetchsuccess: BackgroundFetchUpdateUIEvent;
        backgroundfetchfail: BackgroundFetchUpdateUIEvent;
        backgroundfetchabort: BackgroundFetchEvent;
        backgroundfetchclick: BackgroundFetchEvent;
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

/** Опции, доступные плагинам. В обработчики передаётся context (второй аргумент). */
export interface PluginContext {
    logger?: Logger;
    /** Base path приложения, напр. '/' или '/my-app/'. */
    base?: string;
}

/** Опции инициализации: версия SW, контекст для плагинов + onError для библиотеки (в плагины не передаётся). */
export interface ServiceWorkerInitOptions extends PluginContext {
    /**
     * Версия сервис-воркера / приложения.
     * Используется для ответов на запрос версии и логирования.
     */
    version: string;

    /**
     * Путь для ping-запроса (по умолчанию SW_PING_PATH, т.е. '/sw-ping').
     * Используется внутренним ping-плагином библиотеки.
     */
    pingPath?: string;

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
export type UnionToIntersection<U> = (
    U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
    ? I
    : never;

/** Требуемый тип options по массиву плагинов (пересечение контекстов). P — кортеж плагинов, контекст выводится из каждого. */
export type RequiredOptions<P extends readonly unknown[]> = UnionToIntersection<
    ContextOfPlugin<P[number]>
>;

interface ServiceWorkerEventHandlers {
    install?: (
        event: ExtendableEvent,
        context: PluginContext
    ) => void | Promise<void>;
    activate?: (
        event: ExtendableEvent,
        context: PluginContext
    ) => void | Promise<void>;
    fetch?: (
        event: FetchEvent,
        context: PluginContext
    ) => Promise<Response | undefined>;
    message?: (event: SwMessageEvent, context: PluginContext) => void;
    sync?: (event: SyncEvent, context: PluginContext) => Promise<void>;
    periodicsync?: (event: PeriodicSyncEvent, context: PluginContext) => Promise<void>;
    push?: (
        event: PushEvent,
        context: PluginContext
    ) =>
        | void
        | PushNotificationPayload
        | false
        | Promise<void | PushNotificationPayload | false>;
    backgroundfetchsuccess?: (
        event: BackgroundFetchUpdateUIEvent,
        context: PluginContext
    ) => void | Promise<void>;
    backgroundfetchfail?: (
        event: BackgroundFetchUpdateUIEvent,
        context: PluginContext
    ) => void | Promise<void>;
    backgroundfetchabort?: (
        event: BackgroundFetchEvent,
        context: PluginContext
    ) => void | Promise<void>;
    backgroundfetchclick?: (
        event: BackgroundFetchEvent,
        context: PluginContext
    ) => void | Promise<void>;
}

export interface ServiceWorkerPlugin<
    _C extends PluginContext = PluginContext,
> extends ServiceWorkerEventHandlers {
    name: string;
    order?: number;
}

/** Плагин с контекстом по умолчанию (logger). Алиас для ServiceWorkerPlugin<PluginContext>. */
export type Plugin = ServiceWorkerPlugin<PluginContext>;

export type FetchResponse = Promise<Response | undefined>;

type InstallHandler = (
    event: ExtendableEvent,
    context: PluginContext
) => void | Promise<void>;
type ActivateHandler = (
    event: ExtendableEvent,
    context: PluginContext
) => void | Promise<void>;
type FetchHandler = (
    event: FetchEvent,
    context: PluginContext
) => FetchResponse;
type MessageHandler = (
    event: SwMessageEvent,
    context: PluginContext
) => void;
type SyncHandler = (
    event: SyncEvent,
    context: PluginContext
) => Promise<void>;
type PeriodicsyncHandler = (
    event: PeriodicSyncEvent,
    context: PluginContext
) => Promise<void>;
type PushHandler = (
    event: PushEvent,
    context: PluginContext
) =>
    | void
    | PushNotificationPayload
    | false
    | Promise<void | PushNotificationPayload | false>;
type BackgroundFetchSuccessHandler = (
    event: BackgroundFetchUpdateUIEvent,
    context: PluginContext
) => void | Promise<void>;
type BackgroundFetchFailHandler = (
    event: BackgroundFetchUpdateUIEvent,
    context: PluginContext
) => void | Promise<void>;
type BackgroundFetchAbortHandler = (
    event: BackgroundFetchEvent,
    context: PluginContext
) => void | Promise<void>;
type BackgroundFetchClickHandler = (
    event: BackgroundFetchEvent,
    context: PluginContext
) => void | Promise<void>;

/** Тип возвращаемых обработчиков: обработчики событий SW добавляются только при наличии плагинов. */
export interface CreateEventHandlersResult {
    install?: (event: ExtendableEvent) => void;
    activate?: (event: ExtendableEvent) => void;
    fetch?: (event: FetchEvent) => void;
    message?: (event: SwMessageEvent) => void;
    sync?: (event: SyncEvent) => void;
    periodicsync?: (event: PeriodicSyncEvent) => void;
    push?: (event: PushEvent) => void;
    backgroundfetchsuccess?: (event: BackgroundFetchUpdateUIEvent) => void;
    backgroundfetchfail?: (event: BackgroundFetchUpdateUIEvent) => void;
    backgroundfetchabort?: (event: BackgroundFetchEvent) => void;
    backgroundfetchclick?: (event: BackgroundFetchEvent) => void;
    error: (event: ErrorEvent) => void;
    messageerror: (event: MessageEvent) => void;
    unhandledrejection: (event: PromiseRejectionEvent) => void;
    rejectionhandled: (event: PromiseRejectionEvent) => void;
}

export function createEventHandlers<_C extends PluginContext = PluginContext>(
    plugins: readonly ServiceWorkerPlugin<_C>[],
    options: _C & ServiceWorkerInitOptions
): CreateEventHandlersResult {
    const handlers = {
        install: [] as InstallHandler[],
        activate: [] as ActivateHandler[],
        fetch: [] as FetchHandler[],
        message: [] as MessageHandler[],
        sync: [] as SyncHandler[],
        periodicsync: [] as PeriodicsyncHandler[],
        push: [] as PushHandler[],
        backgroundfetchsuccess: [] as BackgroundFetchSuccessHandler[],
        backgroundfetchfail: [] as BackgroundFetchFailHandler[],
        backgroundfetchabort: [] as BackgroundFetchAbortHandler[],
        backgroundfetchclick: [] as BackgroundFetchClickHandler[],
    };

    const context: PluginContext = {
        logger: options.logger ?? console,
        ...(options.base !== undefined && { base: options.base }),
    };

    function runParallelHandlers<E extends ExtendableEvent>(
        handlerList: Array<
            (event: E, ctx: PluginContext) => void | Promise<void>
        >,
        event: E,
        errorType: ServiceWorkerErrorType
    ): void {
        event.waitUntil(
            Promise.all(
                handlerList.map((handler) =>
                    Promise.resolve()
                        .then(() => handler(event, context))
                        .catch((error: unknown) =>
                            options.onError?.(
                                error as Error,
                                event,
                                errorType
                            )
                        )
                )
            )
        );
    }

    // Сортировка плагинов по order (по умолчанию 0)
    // Порядок важен для fetch и push (последовательное выполнение)
    // Для остальных событий (install, activate, message, sync, periodicsync) выполнение параллельное,
    // но сортировка помогает структурировать конфигурацию
    const sortedPlugins = [...plugins].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    sortedPlugins.forEach((plugin) => {
        if (plugin.install)
            handlers.install.push(plugin.install as InstallHandler);
        if (plugin.activate)
            handlers.activate.push(plugin.activate as ActivateHandler);
        if (plugin.fetch) handlers.fetch.push(plugin.fetch as FetchHandler);
        if (plugin.message)
            handlers.message.push(plugin.message as MessageHandler);
        if (plugin.sync) handlers.sync.push(plugin.sync as SyncHandler);
        if (plugin.periodicsync)
            handlers.periodicsync.push(
                plugin.periodicsync as PeriodicsyncHandler
            );
        if (plugin.push) handlers.push.push(plugin.push as PushHandler);
        if (plugin.backgroundfetchsuccess)
            handlers.backgroundfetchsuccess.push(
                plugin.backgroundfetchsuccess as BackgroundFetchSuccessHandler
            );
        if (plugin.backgroundfetchfail)
            handlers.backgroundfetchfail.push(
                plugin.backgroundfetchfail as BackgroundFetchFailHandler
            );
        if (plugin.backgroundfetchabort)
            handlers.backgroundfetchabort.push(
                plugin.backgroundfetchabort as BackgroundFetchAbortHandler
            );
        if (plugin.backgroundfetchclick)
            handlers.backgroundfetchclick.push(
                plugin.backgroundfetchclick as BackgroundFetchClickHandler
            );
    });

    const result: CreateEventHandlersResult = {
        error: (event: ErrorEvent): void => {
            try {
                options.onError?.(
                    event.error,
                    event,
                    serviceWorkerErrorTypes.ERROR
                );
            } catch (error) {
                context.logger?.error('Error in error handler:', error);
            }
        },

        messageerror: (event: MessageEvent): void => {
            try {
                options.onError?.(
                    event.data,
                    event,
                    serviceWorkerErrorTypes.MESSAGE_ERROR
                );
            } catch (error) {
                context.logger?.error('Error in messageerror handler:', error);
            }
        },

        unhandledrejection: (event: PromiseRejectionEvent): void => {
            try {
                options.onError?.(
                    event.reason,
                    event,
                    serviceWorkerErrorTypes.UNHANDLED_REJECTION
                );
            } catch (error) {
                context.logger?.error('Error in unhandledrejection handler:', error);
            }
        },

        rejectionhandled: (event: PromiseRejectionEvent): void => {
            try {
                options.onError?.(
                    event.reason,
                    event,
                    serviceWorkerErrorTypes.REJECTION_HANDLED
                );
            } catch (error) {
                context.logger?.error('Error in rejectionhandled handler:', error);
            }
        },
    };

    if (handlers.install.length > 0) {
        result.install = (event: ExtendableEvent): void =>
            runParallelHandlers(
                handlers.install,
                event,
                serviceWorkerErrorTypes.INSTALL_ERROR
            );
    }
    if (handlers.activate.length > 0) {
        result.activate = (event: ExtendableEvent): void =>
            runParallelHandlers(
                handlers.activate,
                event,
                serviceWorkerErrorTypes.ACTIVATE_ERROR
            );
    }
    if (handlers.fetch.length > 0) {
        /** Depth of fallback fetch calls. When > 0, we don't call respondWith so the browser handles the request natively (avoids recursion). */
        let passthroughDepth = 0;

        result.fetch = (event: FetchEvent): void => {
            if (passthroughDepth > 0) {
                return;
            }
            event.respondWith(
                (async (): Promise<Response> => {
                    for (const handler of handlers.fetch) {
                        try {
                            const res = await handler(event, context);

                            if (res !== undefined) {
                                return res;
                            }
                        } catch (error) {
                            options.onError?.(
                                error as Error,
                                event,
                                serviceWorkerErrorTypes.FETCH_ERROR
                            );
                        }
                    }
                    try {
                        passthroughDepth++;
                        try {
                            return await fetch(event.request);
                        } finally {
                            passthroughDepth--;
                        }
                    } catch (error) {
                        options.onError?.(
                            error as Error,
                            event,
                            serviceWorkerErrorTypes.FETCH_ERROR
                        );
                        return new Response('', {
                            status: 503,
                            statusText: 'Service Unavailable',
                        });
                    }
                })()
            );
        };
    }
    if (handlers.message.length > 0) {
        result.message = (event: SwMessageEvent): void => {
            handlers.message.forEach((handler) => {
                try {
                    handler(event, context);
                } catch (error) {
                    options.onError?.(
                        error as Error,
                        event,
                        serviceWorkerErrorTypes.MESSAGE_ERROR_HANDLER
                    );
                }
            });
        };
    }
    if (handlers.sync.length > 0) {
        result.sync = (event: SyncEvent): void =>
            runParallelHandlers(
                handlers.sync,
                event,
                serviceWorkerErrorTypes.SYNC_ERROR
            );
    }
    if (handlers.periodicsync.length > 0) {
        result.periodicsync = (event: PeriodicSyncEvent): void =>
            runParallelHandlers(
                handlers.periodicsync,
                event,
                serviceWorkerErrorTypes.PERIODICSYNC_ERROR
            );
    }
    if (handlers.push.length > 0) {
        result.push = (event: PushEvent): void => {
            event.waitUntil(
                (async (): Promise<void> => {
                    const returns: (
                        | PushNotificationPayload
                        | false
                        | undefined
                    )[] = [];

                    for (const handler of handlers.push) {
                        try {
                            const res = await Promise.resolve(
                                handler(event, context)
                            );

                            returns.push(
                                res as
                                    | PushNotificationPayload
                                    | false
                                    | undefined
                            );
                        } catch (error) {
                            options.onError?.(
                                error as Error,
                                event,
                                serviceWorkerErrorTypes.PUSH_ERROR
                            );

                            returns.push(undefined);
                        }
                    }

                    const payloads = returns.filter(
                        (r): r is PushNotificationPayload =>
                            r != null &&
                            typeof r === 'object' &&
                            !Array.isArray(r) &&
                            'title' in r &&
                            typeof r.title === 'string'
                    );

                    if (
                        returns.length === handlers.push.length &&
                        returns.every((r) => r === false)
                    ) {
                        return;
                    }

                    await Promise.all(
                        payloads.map(({ title, ...opts }) =>
                            self.registration.showNotification(title, opts)
                        )
                    );

                    if (payloads.length > 0) {
                        return;
                    }

                    if (!returns.every((r) => r === undefined)) {
                        return;
                    }

                    try {
                        const data = event.data;

                        if (!data) {
                            return;
                        }

                        let payload: unknown;

                        try {
                            payload = await data.json();
                        } catch {
                            const text = data.text();
                            payload = text.length > 0 ? { title: text } : null;
                        }

                        if (payload == null) {
                            return;
                        }

                        const withTitle =
                            typeof payload === 'object' &&
                            payload !== null &&
                            'title' in payload &&
                            typeof (payload as { title: unknown }).title ===
                                'string'
                                ? (payload as {
                                      title: string;
                                  } & Record<string, unknown>)
                                : null;

                        if (withTitle == null) {
                            return;
                        }

                        const { title, ...opts } = withTitle;

                        await self.registration.showNotification(title, opts);
                    } catch (error) {
                        options.onError?.(
                            error as Error,
                            event,
                            serviceWorkerErrorTypes.PUSH_ERROR
                        );
                    }
                })()
            );
        };
    }
    if (handlers.backgroundfetchsuccess.length > 0) {
        result.backgroundfetchsuccess = (
            event: BackgroundFetchUpdateUIEvent
        ): void =>
            runParallelHandlers(
                handlers.backgroundfetchsuccess,
                event,
                serviceWorkerErrorTypes.BACKGROUNDFETCHSUCCESS_ERROR
            );
    }
    if (handlers.backgroundfetchfail.length > 0) {
        result.backgroundfetchfail = (
            event: BackgroundFetchUpdateUIEvent
        ): void =>
            runParallelHandlers(
                handlers.backgroundfetchfail,
                event,
                serviceWorkerErrorTypes.BACKGROUNDFETCHFAIL_ERROR
            );
    }
    if (handlers.backgroundfetchabort.length > 0) {
        result.backgroundfetchabort = (event: BackgroundFetchEvent): void =>
            runParallelHandlers(
                handlers.backgroundfetchabort,
                event,
                serviceWorkerErrorTypes.BACKGROUNDFETCHABORT_ERROR
            );
    }
    if (handlers.backgroundfetchclick.length > 0) {
        result.backgroundfetchclick = (event: BackgroundFetchEvent): void =>
            runParallelHandlers(
                handlers.backgroundfetchclick,
                event,
                serviceWorkerErrorTypes.BACKGROUNDFETCHCLICK_ERROR
            );
    }

    return result;
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

    const filteredPlugins: readonly Plugin[] = Array.isArray(plugins)
        ? (plugins as readonly (Plugin | null | undefined)[]).filter(
              (p): p is Plugin => p != null
          )
        : [];

    const internalPlugins: Plugin[] = [
        createVersionPlugin(opts.version),
        createPingPlugin(opts.pingPath ?? SW_PING_PATH),
    ];

    const allPlugins = [...internalPlugins, ...filteredPlugins];
    const names = new Set<string>();

    for (const plugin of allPlugins) {
        if (names.has(plugin.name)) {
            opts.logger.warn(`Duplicate plugin name: "${plugin.name}"`);
        }

        names.add(plugin.name);
    }

    const handlers = createEventHandlers(allPlugins, opts);

    // Регистрируем глобальные обработчики ошибок
    self.addEventListener(SW_EVENT_ERROR, handlers.error);
    self.addEventListener(SW_EVENT_MESSAGEERROR, handlers.messageerror);
    self.addEventListener(
        SW_EVENT_UNHANDLEDREJECTION,
        handlers.unhandledrejection
    );
    self.addEventListener(SW_EVENT_REJECTIONHANDLED, handlers.rejectionhandled);

    // Регистрируем обработчики событий SW только для тех, для которых есть плагины
    if (handlers.install)
        self.addEventListener(SW_EVENT_INSTALL, handlers.install);
    if (handlers.activate)
        self.addEventListener(SW_EVENT_ACTIVATE, handlers.activate);
    if (handlers.fetch) self.addEventListener(SW_EVENT_FETCH, handlers.fetch);
    if (handlers.message)
        self.addEventListener(SW_EVENT_MESSAGE, handlers.message);
    if (handlers.sync) self.addEventListener(SW_EVENT_SYNC, handlers.sync);
    if (handlers.periodicsync)
        self.addEventListener(SW_EVENT_PERIODICSYNC, handlers.periodicsync);
    if (handlers.push) self.addEventListener(SW_EVENT_PUSH, handlers.push);

    const hasBackgroundFetchHandlers =
        !!handlers.backgroundfetchsuccess ||
        !!handlers.backgroundfetchfail ||
        !!handlers.backgroundfetchabort ||
        !!handlers.backgroundfetchclick;
    const isBackgroundFetchSupported =
        typeof self.registration !== 'undefined' &&
        self.registration != null &&
        'backgroundFetch' in (self.registration as object);

    if (hasBackgroundFetchHandlers && !isBackgroundFetchSupported) {
        opts.logger.warn(
            'Background Fetch API is not supported in this browser; plugins registered background fetch handlers but they will not be used.'
        );
    }

    if (isBackgroundFetchSupported) {
        if (handlers.backgroundfetchsuccess)
            self.addEventListener(
                SW_EVENT_BACKGROUNDFETCHSUCCESS,
                handlers.backgroundfetchsuccess
            );
        if (handlers.backgroundfetchfail)
            self.addEventListener(
                SW_EVENT_BACKGROUNDFETCHFAIL,
                handlers.backgroundfetchfail
            );
        if (handlers.backgroundfetchabort)
            self.addEventListener(
                SW_EVENT_BACKGROUNDFETCHABORT,
                handlers.backgroundfetchabort
            );
        if (handlers.backgroundfetchclick)
            self.addEventListener(
                SW_EVENT_BACKGROUNDFETCHCLICK,
                handlers.backgroundfetchclick
            );
    }
}

function createVersionPlugin(version: string): Plugin {
    return {
        name: 'version',

        message: (event: SwMessageEvent): void => {
            const data = event.data;

            if (
                data == null ||
                typeof data !== 'object' ||
                !('type' in data) ||
                (data as { type: unknown }).type !== PLUGGABLE_SW_GET_VERSION
            ) {
                return;
            }

            event.source?.postMessage({
                type: PLUGGABLE_SW_VERSION,
                version,
            });
        },
    };
}

function createPingPlugin(path: string): Plugin {
    return {
        name: 'ping',

        fetch: async (event): Promise<Response | undefined> => {
            if (event.request.method !== 'GET') {
                return undefined;
            }

            const url = new URL(event.request.url);

            if (url.pathname !== path) {
                return undefined;
            }

            return new Response('', { status: 204 });
        },
    };
}
