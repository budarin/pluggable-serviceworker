# @budarin/pluggable-serviceworker

Библиотека для создания модульных и расширяемых Service Worker'ов с помощью системы плагинов.

> Библиотека рассчитана на продакшн-использование: типизированный API, предсказуемый порядок выполнения плагинов, централизованная обработка ошибок, встроенные version/ping-механизмы и готовые сценарии активации SW позволяют безопасно использовать её в серьёзных фронтенд-проектах.

[Статья на Хаьре: Сервисворкер: когда Workbox уже слишком тяжёлый](https://habr.com/ru/articles/995064/)

## Содержание

- [Почему этот пакет облегчает разработку?](#-почему-этот-пакет-облегчает-разработку)
    - [Модульная архитектура](#-модульная-архитектура)
    - [Предсказуемый порядок выполнения](#-предсказуемый-порядок-выполнения)
    - [Легко изучить и понять](#-легко-изучить-и-понять)
    - [Маленький размер](#-маленький-размер)
    - [Полный контроль над кодом](#-полный-контроль-над-кодом)
    - [Централизованная обработка ошибок](#-централизованная-обработка-ошибок)
    - [Удобное логирование](#-удобное-логирование)
    - [Готовые решения из коробки](#-готовые-решения-из-коробки)
- [Установка](#-установка)
- [Быстрый старт](#-быстрый-старт)
    - [Базовое использование](#базовое-использование)
- [Демо](#демо)
- [initServiceWorker(plugins, options)](#initserviceworkerplugins-options)
- [Опции initServiceWorker](#️-опции-initserviceworker-version-pingpath-base-logger-onerror-passthroughrequestheader)
    - [Поля options](#поля-options)
    - [Обработка ошибок](#обработка-ошибок)
- [Плагины](#плагины)
    - [Интерфейс плагина](#-интерфейс-плагина)
    - [Описание методов](#-описание-методов)
    - [Особенности обработчиков](#-особенности-обработчиков)
- [Порядок выполнения плагинов](#-порядок-выполнения-плагинов)
    - [Пример](#пример)
- [Логика выполнения обработчиков](#-логика-выполнения-обработчиков)
    - [Параллельное выполнение](#-параллельное-выполнение)
    - [Последовательное выполнение](#️-последовательное-выполнение)
    - [Сводная таблица](#-сводная-таблица)
- [Примитивы, пресеты и типовые сервис-воркеры](#примитивы-пресеты-и-типовые-сервис-воркеры)
    - [Примитивы (плагины)](#примитивы-плагины)
    - [Пресеты](#пресеты)
    - [Типовые сервис-воркеры (из коробки)](#типовые-сервис-воркеры-из-коробки)
    - [Публикуемые утилиты](#публикуемые-утилиты)
    - [Рецепт: пробуждение SW](#-рецепт-пробуждение-sw)
    - [Примечание про обход бага Chrome с claim()](#-примечание-про-обход-бага-chrome-с-claim-при-1-й-установке-сервисворкера)
- [Разработка отдельного пакета плагина](#разработка-отдельного-пакета-плагина)
- [Плагины (готовые)](#плагины-1)
- [Лицензия](#-лицензия)

## 🚀 Почему этот пакет облегчает разработку?

Сервис‑воркеры дают много возможностей, но в реальном проекте быстро превращаются в набор разрозненных обработчиков, сложных правил кеширования и неочевидных ошибок. Крупные библиотеки помогают, но часто привносят свою модель роутинга и стратегий, за которую тоже нужно «держаться головой». Этот пакет предлагает более простой путь: один типизированный контракт плагина, предсказуемый порядок выполнения и готовые кирпичики, которые остаются близкими к нативному API сервис‑воркера.

### 🔌 **Модульная архитектура**

- **Плагины как строительные блоки** — каждый плагин отвечает за одну задачу (кеширование, аутентификация, уведомления, версии и т.п.).
- Сервис‑воркер собирается из небольших частей вместо одного монолитного скрипта.
- Инфраструктурный код для событий (`install`, `activate`, `fetch` и др.) живёт в библиотеке; вы описываете только поведение.

### 🎯 **Предсказуемый порядок выполнения**

- Плагины сортируются по полю `order` (по возрастанию, по умолчанию `0`) ещё до регистрации обработчиков.
- Для `fetch` цепочка выполняется **последовательно**: первый плагин, вернувший не `undefined`, завершает обработку.
- Для `push` вызываются все обработчики; для большинства остальных событий (`install`, `activate`, `message`, `sync`, события Background Fetch и др.) обработчики выполняются **параллельно**.
- Слушатели событий регистрируются только если хотя бы один плагин реализует соответствующий хук — лишних обработчиков нет.

### 📖 **Простой для освоения контракт**

- Одна основная сущность — `Plugin` с опциональными хуками; нет отдельного языка роутинга или стратегий.
- Небольшое количество понятий: плагин, фабрика плагина, `initServiceWorker`, опции.
- Тип `ServiceWorkerPlugin` служит живой документацией: по нему видно, какие события и контексты вы можете использовать.

### 📦 **Лёгкий рантайм**

- Минимум зависимостей и никакой встроенной сборки.
- В бандл попадает только то, что вы явно импортируете.
- Подходит для проектов, где важен размер бандла и контролируемая зависимостями экосистема.

### 🎛 **Полный контроль над поведением**

- Вы задаёте, какие ресурсы кешируются и по каким правилам обновляются.
- Порядок плагинов, логирование и обработка ошибок конфигурируются явно.
- Нестандартные сценарии реализуются прямо в плагинах — без обходных манёвров вокруг чужих абстракций.

### 🛡️ **Централизованная обработка ошибок**

- Единый хук `onError` получает структурированную информацию о том, где и что пошло не так.
- Ошибка в одном плагине не ломает остальные; глобальные ошибки сервис‑воркера обрабатываются в одном месте.
- Типизированные ошибки позволяют по‑разному реагировать на проблемы установки, активации, fetch‑запросов или Background Fetch.

### 📝 **Удобное логирование**

- Подключаемый логгер с уровнями (`trace`, `debug`, `info`, `warn`, `error`).
- В каждый хук плагина приходит один и тот же context (logger, base), что упрощает сопоставление событий и разрешение путей ассетов.
- Можно использовать свою систему логирования, если она реализует ожидаемый интерфейс.

### ✅ **Готовые решения из коробки**

- Набор готовых плагинов: `precache`, `cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `skipWaiting`, `claim` и другие.
- Пресет **offlineFirst** — предзагрузка при установке и отдача из кеша при запросах.
- Готовые точки входа сервис‑воркера: `activateOnSignal`, `activateImmediately`, `activateOnNextVisit`.
- Клиентские утилиты для работы с сервис‑воркером: регистрация с обходом бага `claim()`, обнаружение новой версии, подписка на сообщения, запрос версии, отправка сообщений, ping для «пробуждения», проверка поддержки, **Background Fetch** (запуск/отмена/статус загрузок).

## 📦 Установка

```bash
npm install @budarin/pluggable-serviceworker
```

или

```bash
pnpm add @budarin/pluggable-serviceworker
```

## 🚀 Быстрый старт

### Базовое использование

```ts
// precacheAndServePlugin.js
import type { Plugin } from '@budarin/pluggable-serviceworker';
import { matchByUrl } from '@budarin/pluggable-serviceworker/utils';

export function precacheAndServePlugin(config: {
    cacheName: string;
    assets: string[];
}): Plugin {
    const { cacheName, assets } = config;

    return {
        name: 'precache-and-serve',

        install: async (_event, context) => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
        },

        fetch: async (event, context) => {
            const cache = await caches.open(cacheName);
            const asset = await matchByUrl(cache, event.request);

            if (!asset) {
                context.logger?.debug(
                    `precache-and-serve: asset ${event.request.url} not found in cache!`
                );
            }

            return asset ?? undefined;
        },
    };
}
```

```ts
// sw.ts
import { precacheAndServePlugin } from './precacheAndServePlugin';
import { initServiceWorker } from '@budarin/pluggable-serviceworker';

initServiceWorker(
    [
        precacheAndServePlugin({
            cacheName: 'my-cache-v1',
            assets: ['/', '/styles.css', '/script.js'],
        }),
    ],
    { version: '1.8.0' }
);
```

**Почему `matchByUrl`, а не `cache.match(event.request)`?** Браузер отправляет запросы с разным `mode` (скрипт — `script`, стили, картинки и т.д. — свои варианты), а в кэш при precache запись попадает с другим mode. `cache.match()` требует полного совпадения (URL, mode, credentials) — не находит, в итоге «Failed to fetch». `matchByUrl()` ищет только по URL (path); по умолчанию игнорирует query, так что `/a.js?v=1` находит запись для `/a.js`. Используйте его в fetch-обработчике при поиске в кэше по запросу для любых ресурсов.

## Демо

В папке [demo/](demo/) — приложение **React + Vite** с пресетом **offlineFirst** и типовым сервис-воркером **activateOnSignal**. Запуск из корня: `pnpm start`. Подробности — в [demo/README.md](demo/README.md).

## initServiceWorker(plugins, options)

`initServiceWorker` — точка входа: регистрирует обработчики событий Service Worker (`install`, `activate`, `fetch`, …) и прогоняет их через список плагинов. **Регистрируются только те события, для которых есть хотя бы один плагин** — если ни один плагин не реализует, например, `sync`, сервис-воркер не будет подписываться на `sync`.

- **`plugins`** — массив плагинов (объектов). Плагины с конфигом получаются вызовом **фабрик** по месту использования (см. раздел «Фабрика плагинов»). Элементы `null` и `undefined` (например, когда фабрика возвращает `undefined` из‑за недоступности API) игнорируются; вручную фильтровать массив не нужно.
- **`options`** — минимум `version` (обязательный), а также опциональные `pingPath?`, `base?`, `logger?`, `onError?`. В обработчики плагинов вторым аргументом передаётся **context** (logger, base).

**Пример:**

```ts
initServiceWorker(
    [
        precache({ cacheName: 'v1', assets: ['/'] }),
        serveFromCache({ cacheName: 'v1' }),
    ],
    {
        version: '1.8.0',
        base: '/',
        logger: customLogger,
        onError: handleError,
    }
);
```

## ⚙️ Опции initServiceWorker (version, pingPath, base, logger, onError, passthroughRequestHeader)

Второй параметр `options` типа `ServiceWorkerInitOptions`: в нём обязательное поле `version` и опциональные `pingPath?`, `base?`, `logger?`, `onError?` и `passthroughRequestHeader?`. В обработчики плагинов передаётся **context** (logger, base); если `logger` не указан, используется `console`. Поле `onError` нужно только библиотеке, в плагины не передаётся.

Тип `PluginContext` в API используется для типизации; плагины получают его вторым аргументом.

```ts
interface PluginContext {
    logger?: Logger;            // по умолчанию console
    base?: string;              // base path приложения, напр. '/' или '/my-app/'
    passthroughHeader: string; // имя заголовка для сквозных запросов (задаётся библиотекой из опции passthroughRequestHeader или PSW_PASSTHROUGH_HEADER)
    fetchPassthrough: (request: Request) => Promise<Response>; // fetch в обход плагинов, без CORS-нарушений; доступен только в контексте плагинов
}

interface ServiceWorkerInitOptions {
    /** Версия сервис-воркера / приложения (строка, например '1.8.0'). */
    version: string;

    /** Base path приложения, напр. '/' или '/my-app/'. */
    base?: string;

    logger?: Logger;

    /** Необязательный путь для ping-запроса (по умолчанию '/sw-ping'). */
    pingPath?: string;

    /**
     * Имя заголовка, по которому запрос считается «сквозным»:
     * он не передаётся в плагины и обрабатывается браузером напрямую (сетевой запрос).
     * По умолчанию — PSW_PASSTHROUGH_HEADER ('X-PSW-Passthrough'), работает без явной настройки.
     */
    passthroughRequestHeader?: string;

    onError?: (error, event, errorType?) => void; // только для библиотеки, в плагины не передаётся
}
```

### Поля options

#### `version: string` (обязательное)

Строка с версией сервис-воркера / приложения. Используется:

- во внутреннем плагине библиотеки, который отвечает на запрос версии (`getServiceWorkerVersion()` на клиенте);
- для логирования и отладки (вы можете логировать её в своём `onError` / логгере).

Рекомендуется использовать ту же строку, что и версию фронтенд-приложения (например, из `package.json`).

**Пример:**

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
});
```

#### `base?: string` (опциональное)

Base path приложения, напр. `'/'` или `'/my-app/'`. Используется плагинами ассетов (`precache`, `restoreAssetToCache` и др.) для разрешения URL. Когда приложение развёрнуто по подпути, передайте тот же base, что в конфиге сборки, чтобы закэшированные URL совпадали с входящими запросами.

**Параметры, связанные с ассетами — пути относительно корня приложения.** Везде, где задаётся список ресурсов (`assets` в конфигах плагинов, аргументы `resolveAssetUrls` и `isRequestUrlInAssets`), перечисляются пути к ресурсам относительно корня приложения: `'/'`, `'/main.js'` и т.д.

**Пример:**

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
    base: '/',
});
```

Для приложения по подпути используйте тот же base, что в конфиге сборки.

**Пример для Vite:** используйте `base: import.meta.env.BASE_URL`, чтобы совпадало с `vite.config` → `base`.

#### `pingPath?: string` (опциональное)

Переопределяет путь ping-запроса, который обрабатывается внутренним ping-плагином библиотеки. По умолчанию используется `'/sw-ping'` (константа `SW_PING_PATH`). Этот путь должен совпадать с тем, что вы используете на клиенте при вызове `pingServiceWorker({ path: ... })`, если вы меняете его.

**Примеры:**

```ts
// По умолчанию — внутренний плагин обрабатывает GET /sw-ping
initServiceWorker(plugins, {
    version: '1.8.0',
});

// Кастомный путь для ping (например, чтобы не конфликтовать с бэкендом)
initServiceWorker(plugins, {
    version: '1.8.0',
    pingPath: '/internal/sw-ping',
});
```

#### `passthroughRequestHeader?: string` (опциональное)

**Проблема.** Когда плагин делает внутренний `fetch()` — например, `staleWhileRevalidate` запрашивает свежую копию для обновления кеша, или плагин аналитики отправляет событие — этот запрос снова попадает в обработчик `fetch` сервис-воркера и проходит через все плагины. Это может привести к бесконечной рекурсии или к тому, что «внутренний» запрос будет обслужен из кеша вместо того, чтобы уйти в сеть.

**Решение.** Используйте `context.fetchPassthrough(request)` вместо голого `fetch()`. Библиотека направляет запрос напрямую в сеть, минуя все плагины, с учётом origin:

- **cross-origin запрос** — `fetch(request)` вызывается без модификации. SW физически не перехватывает свои cross-origin запросы (они вне его scope), поэтому re-entry и CORS preflight невозможны.
- **same-origin запрос** — passthrough-заголовок добавляется к клону `Request`. Это предотвращает повторный вход в `fetch`-обработчик SW. CORS проблем нет — same-origin запросы preflight не требуют.

Заголовок `passthroughRequestHeader` — альтернативный механизм: он срабатывает, когда запрос с маркером приходит **снаружи** SW (например, из другого скрипта). По умолчанию — `PSW_PASSTHROUGH_HEADER` (`'X-PSW-Passthrough'`).

**Как делать сетевой запрос внутри плагина** — всегда используйте `context.fetchPassthrough`:

```ts
fetch: async (event, context) => {
    // ✅ правильно — обходит цепочку плагинов, не нарушает CORS
    const response = await context.fetchPassthrough(event.request);
    // ...
}
```

**Никогда** не вызывайте голый `fetch()` для внутренних запросов — ответ снова попадёт в обработчик и пройдёт через все плагины:

```ts
fetch: async (event, context) => {
    // ❌ неправильно — запрос снова войдёт в цепочку плагинов
    const response = await fetch(event.request);
}
```

Встроенные плагины (`cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `restoreAssetToCache`) уже используют `context.fetchPassthrough` внутри.

**Кастомное имя заголовка** (если нужно избежать конфликта с другими заголовками):

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
    passthroughRequestHeader: 'X-My-Internal',
});
```

#### `logger?: Logger` (опциональное)

Объект для логирования с методами `info`, `warn`, `error`, `debug`. По умолчанию используется `console`. Может быть передан любой объект, реализующий интерфейс `Logger`.

```ts
interface Logger {
    trace: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
}
```

**Пример:**

```ts
const options = {
    logger: customLogger, // Использование кастомного логгера
    // или
    logger: {
        trace: (...data) => customLogger('TRACE', ...data),
        debug: (...data) => customLogger('DEBUG', ...data),
        info: (...data) => customLogger('INFO', ...data),
        warn: (...data) => customLogger('WARN', ...data),
        error: (...data) => customLogger('ERROR', ...data),
    },
};
```

#### `onError?: (error, event, errorType) => void` (опциональное)

Единый обработчик для всех типов ошибок в Service Worker. **Дефолтного обработчика ошибок нет** - если `onError` не передан, ошибки будут проигнорированы (не обработаны).

**Параметры:**

- `error: Error | any` - объект ошибки
- `event: Event` - событие, в контексте которого произошла ошибка
- `errorType?: ServiceWorkerErrorType` - тип ошибки (см. раздел "Обработка ошибок")

**Важно:** Если `onError` не указан, ошибки в плагинах и глобальные ошибки будут проигнорированы. Для production-окружения рекомендуется всегда указывать `onError` для логирования и мониторинга ошибок.

**Примеры конфигурации:**

```ts
// Минимальная конфигурация: только версия
initServiceWorker([cachePlugin], {
    version: '1.8.0',
});

// С onError - ошибки будут обработаны
initServiceWorker([cachePlugin], {
    version: '1.8.0',
    onError: (error, event, errorType) => {
        console.error('Service Worker error:', error, errorType);
    },
});
```

### Обработка ошибок

Библиотека позволяет описать единый обработчик для всех типов ошибок в Service Worker и выполнить обработку индивидуально каждого типа ошибки. Она сама подписывается на глобальные события `error`, `messageerror`, `unhandledrejection`, `rejectionhandled`; ошибка в одном плагине не останавливает выполнение остальных. Если внутри `onError` произойдёт исключение, оно логируется через `options.logger`.

```ts
import {
    initServiceWorker,
    serviceWorkerErrorTypes,
} from '@budarin/pluggable-serviceworker';

const logger = console; // или свой объект с методами info, warn, error, debug

const options = {
    version: '1.8.0',
    logger,
    onError: (error, event, errorType) => {
        logger.info(`Ошибка типа "${errorType}":`, error);

        switch (errorType) {
            // Ошибки в плагинах при обработке соответствующего события
            case serviceWorkerErrorTypes.INSTALL_ERROR:
            case serviceWorkerErrorTypes.ACTIVATE_ERROR:
            case serviceWorkerErrorTypes.FETCH_ERROR:
            case serviceWorkerErrorTypes.MESSAGE_ERROR:
            case serviceWorkerErrorTypes.SYNC_ERROR:
            case serviceWorkerErrorTypes.PERIODICSYNC_ERROR:
            case serviceWorkerErrorTypes.PUSH_ERROR:
            case serviceWorkerErrorTypes.BACKGROUNDFETCHSUCCESS_ERROR:
            case serviceWorkerErrorTypes.BACKGROUNDFETCHFAIL_ERROR:
            case serviceWorkerErrorTypes.BACKGROUNDFETCHABORT_ERROR:
            case serviceWorkerErrorTypes.BACKGROUNDFETCHCLICK_ERROR:
                logger.error(`Plugin error (${errorType}):`, error);

                // если нужно - мы можем получить конкретную точку в коде того плагина в котором произошла ошибка
                if (error instanceof Error && error.stack) {
                    logger.error('Plugin error Stack:', error.stack);
                }

                break;

            // Глобальные JavaScript ошибки
            case serviceWorkerErrorTypes.ERROR:
                logger.error('JavaScript error:', error);
                break;

            // Глобальное событие messageerror (например, ошибка structured clone)
            case serviceWorkerErrorTypes.MESSAGE_ERROR_HANDLER:
                logger.error('Message error:', error);
                break;

            // Необработанные Promise rejection
            case serviceWorkerErrorTypes.UNHANDLED_REJECTION:
                logger.error('Unhandled promise rejection:', error);
                break;

            // Обработанные Promise rejection
            case serviceWorkerErrorTypes.REJECTION_HANDLED:
                logger.info('Promise rejection handled:', error);
                break;

            // Неизвестные типы ошибок
            default:
                logger.error('Unknown error type:', error);

                // можно даже так - отправка ошибки в аналитику
                fetch('/api/errors', {
                    method: 'POST',
                    body: JSON.stringify({
                        error: error.message,
                        eventType: event.type,
                        url: event.request?.url,
                        timestamp: Date.now(),
                    }),
                }).catch(() => {
                    // Игнорируем ошибки отправки логов
                });
        }
    },
};

initServiceWorker(
    [
        /* ваши плагины */
    ],
    options
);
```

## Плагины

**Плагин** — это объект с полем `name` и опциональными обработчиками (`install`, `fetch`, `activate` и т.д.). В массив `initServiceWorker(plugins, options)` передаются именно такие объекты.

**Фабрика плагина** — функция, которая принимает конфиг и возвращает плагин (объект). Например: `precache(config)`, `serveFromCache(config)` или собственная `precacheAndServePlugin(config)` из примера выше. Конфиг задаётся по месту вызова фабрики.

### 🔌 Интерфейс плагина

Плагин — объект, реализующий интерфейс `ServiceWorkerPlugin`. Специфичный для плагина конфиг задаётся при вызове **фабрики** плагина. Параметр типа `_C` используется для типизации контекста.

**Контекст** (`PluginContext`) — второй аргумент каждого обработчика. Передаётся из `initServiceWorker(plugins, options)`; поля `options` попадают в контекст:

```ts
interface PluginContext {
    logger?: Logger;           // Логгер (по умолчанию console).
    base?: string;             // Base path приложения.
    passthroughHeader: string; // Имя заголовка для сквозных запросов (задаётся библиотекой).
}
```

```ts
interface ServiceWorkerPlugin<_C extends PluginContext = PluginContext> {
    name: string;

    order?: number;

    install?: (
        event: ExtendableEvent,
        context: PluginContext
    ) => Promise<void> | void;

    activate?: (
        event: ExtendableEvent,
        context: PluginContext
    ) => Promise<void> | void;

    fetch?: (
        event: FetchEvent,
        context: PluginContext
    ) => Promise<Response | undefined> | Response | undefined;

    message?: (event: SwMessageEvent, context: PluginContext) => void;

    sync?: (event: SyncEvent, context: PluginContext) => Promise<void> | void;

    push?: (
        event: PushEvent,
        context: PluginContext
    ) =>
        | Promise<PushNotificationPayload | void>
        | PushNotificationPayload
        | void;

    periodicsync?: (
        event: PeriodicSyncEvent,
        context: PluginContext
    ) => Promise<void> | void;

    backgroundfetchsuccess?: (
        event: BackgroundFetchUpdateUIEvent,
        context: PluginContext
    ) => Promise<void> | void;
    backgroundfetchfail?: (
        event: BackgroundFetchUpdateUIEvent,
        context: PluginContext
    ) => Promise<void> | void;
    backgroundfetchabort?: (
        event: BackgroundFetchEvent,
        context: PluginContext
    ) => Promise<void> | void;
    backgroundfetchclick?: (
        event: BackgroundFetchEvent,
        context: PluginContext
    ) => Promise<void> | void;
}
```

### 📝 Описание методов

| Метод                    | Событие                  | Возвращает                                      | Описание                                                                                                            |
| ------------------------ | ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `install`                | `install`                | `void`                                          | Инициализация плагина при установке SW                                                                              |
| `activate`               | `activate`               | `void`                                          | Активация плагина при обновлении SW                                                                                 |
| `fetch`                  | `fetch`                  | `Response \| undefined`                         | Обработка сетевых запросов                                                                                          |
| `message`                | `message`                | `void`                                          | Обработка сообщений от основного потока                                                                             |
| `sync`                   | `sync`                   | `void`                                          | Синхронизация данных в фоне                                                                                         |
| `push`                   | `push`                   | `PushNotificationPayload \| false \| undefined` | Обработка и отображение сетевой нотификации                                                                         |
| `periodicsync`           | `periodicsync`           | `void`                                          | Периодические фоновые задачи                                                                                        |
| `backgroundfetchsuccess` | `backgroundfetchsuccess` | `void`                                          | [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API): все загрузки успешны |
| `backgroundfetchfail`    | `backgroundfetchfail`    | `void`                                          | Background Fetch: хотя бы одна загрузка с ошибкой                                                                   |
| `backgroundfetchabort`   | `backgroundfetchabort`   | `void`                                          | Background Fetch: загрузка отменена пользователем или приложением                                                   |
| `backgroundfetchclick`   | `backgroundfetchclick`   | `void`                                          | Background Fetch: пользователь нажал на UI загрузки                                                                 |

Логика работы пакета очень простая:

- элементы массива плагинов `null` и `undefined` игнорируются (например, когда фабрика возвращает `undefined`, если API недоступен). Фильтровать вручную не нужно
- создаются массивы под все типы событий: install, activate, fetch, message, sync, periodicsync, push, backgroundfetchsuccess, backgroundfetchfail, backgroundfetchabort, backgroundfetchclick
- плагины сортируются по `order` (по возрастанию, по умолчанию 0)
- в этом порядке по каждому плагину его обработчики добавляются в соответствующие массивы по типам
- **подписка на событие добавляется только если есть хотя бы один обработчик** — `addEventListener` вызывается только для таких событий
- **Background Fetch**: подписки на `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick` регистрируются только при поддержке API браузером (`'backgroundFetch' in self.registration`). Если плагины зарегистрировали обработчики BF, но API не поддерживается, в лог выводится предупреждение.
- при наступлении события в сервис-воркере вызываются обработчики из соответствующего массива

### 🎯 Особенности обработчиков

- Во все методы первым аргументом передаётся объект `event` и вторым аргументом — **context** (logger, base).
- **`fetch`**: может вернуть `Response` для завершения цепочки или `undefined` для передачи следующему плагину. Если все плагины вернули `undefined`, фреймворк вызывает `fetch(event.request)`.
- **`push`**: может вернуть `PushNotificationPayload` (объект для [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)), `false` (не отображать уведомление) или `undefined` (решение об отображении отдаётся библиотеке). Вызываются все плагины с `push`. Для каждого результата типа `PushNotificationPayload` вызывается `showNotification` (несколько уведомлений показываются параллельно). Уведомление не показывается, если все вернули `false` или смесь `undefined` и `false` без payload. Библиотека отображает одно уведомление **только когда все** плагины вернули `undefined` (и в данных есть что показывать).
- **Остальные обработчики** (`install`, `activate`, `message`, `sync`, `periodicsync`, `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick`): возвращаемое значение не используется; фреймворк вызывает метод каждого плагина по очереди, цепочка не прерывается.
- **Все обработчики опциональны** — реализуйте только нужные события. Если ни один плагин не реализует событие, сервис-воркер не подписывается на него.

## 🎯 Порядок выполнения плагинов

Плагины сортируются по `order` (по возрастанию). Если `order` не указан, он по умолчанию равен `0`.

**Важно:** Порядок важен для:

- **`fetch`** — обработчики выполняются последовательно; первый плагин, вернувший `Response`, останавливает цепочку
- **`push`** — обработчики выполняются последовательно

Для остальных событий (`install`, `activate`, `message`, `sync`, `periodicsync`, `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick`) обработчики выполняются **параллельно**, поэтому порядок в основном нужен для организации конфигурации.

### Пример:

```ts
import {
    precache,
    serveFromCache,
    cacheFirst,
} from '@budarin/pluggable-serviceworker/plugins';

initServiceWorker(
    [
        precache({
            cacheName: 'v1',
            assets: ['/'],
            order: -10, // Ранний
        }),
        serveFromCache({
            cacheName: 'v1', // order по умолчанию 0
        }),
        cacheFirst({
            cacheName: 'api',
            order: 100, // Поздний
        }),
    ],
    {
        version: '1.8.0',
        base: '/',
    }
);

// Порядок выполнения: precache (order -10) → serveFromCache (order 0) → cacheFirst (order 100)
```

**Рекомендации по использованию `order`:**

В большинстве случаев можно обходиться без явного указания `order` — просто разместите плагины в массиве в том порядке, в котором хотите их выполнять. Все плагины по умолчанию имеют `order = 0`, поэтому они будут выполняться в порядке их регистрации.

Явное указание `order` полезно в крайних случаях, когда нужно:

- Если вы используете пресеты с не понятным порядком исполнения плагинов в нем
- Использовать плагины из разных источников и контролировать их относительный порядок
- Организовать плагины по группам (ранние, обычные, поздние)

**Рекомендуемые диапазоны значений `order`:**

- **`-100…-1`** — Ранние плагины (логирование, метрики, трассировка)
- **`0`** — Обычные плагины (по умолчанию)
- **`1…100`** — Поздние плагины (fallback'и, финальные обработчики)

## ⚡ Логика выполнения обработчиков

Разные типы событий Service Worker обрабатываются по-разному в зависимости от их специфики:

### 🔄 Параллельное выполнение

**События:** `install`, `activate`, `message`, `sync`, `periodicsync`

Все обработчики выполняются **одновременно** с помощью `Promise.all()`:

```ts
import {
    precache,
    skipWaiting,
    precacheMissing,
} from '@budarin/pluggable-serviceworker/plugins';

import { customLogger } from '../customLogger';
import { initServiceWorker } from '@budarin/pluggable-serviceworker';

// Все install-обработчики (precache, precacheMissing, skipWaiting) выполнятся параллельно
initServiceWorker(
    [
        precache({
            cacheName: 'app-v1',
            assets: ['/', '/main.js'],
        }),
        precacheMissing({
            cacheName: 'ext-v1',
            assets: ['/worker.js'],
        }),
        skipWaiting(),
    ],
    {
        version: '1.8.0',
        base: '/',
        logger: customLogger,
    }
);
```

**Почему параллельно:**

- **install/activate**: Все плагины должны инициализироваться независимо
- **message**: Все плагины должны получить сообщение одновременно
- **sync**: Разные задачи синхронизации независимы (синхронизация данных + кеша)
- **periodicsync**: Периодические задачи независимы друг от друга

### ➡️ Последовательное выполнение

**События:** `fetch`, `push`

Обработчики выполняются **по очереди**:

#### Fetch — с прерыванием цепочки

Обработчики `fetch` вызываются **по очереди**. Плагин может вернуть `Response` — тогда цепочка прерывается и этот ответ уходит клиенту. Либо вернуть `undefined` — тогда запрос передаётся следующему плагину. Если **все** плагины вернули `undefined`, фреймворк сам выполняет `fetch(event.request)`.

Пример фабрики, которая прерывает цепочку при неавторизованном доступе к защищённым путям:

```ts
import type { Plugin } from '@budarin/pluggable-serviceworker';

function authPlugin(config: {
    protectedPaths: string[];
    order?: number;
}): Plugin {
    const { protectedPaths, order = 0 } = config;

    return {
        order,
        name: 'auth',

        fetch: async (event, context) => {
            const path = new URL(event.request.url).pathname;

            if (protectedPaths.some((p) => path.startsWith(p))) {
                if (needsAuth(event.request)) {
                    context.logger?.warn(
                        'auth: unauthorized',
                        event.request.url
                    );

                    return new Response('Unauthorized', { status: 401 }); // Прерывает цепочку
                }
            }

            return undefined; // Передаёт следующему плагину
        },
    };
}

// Использование: authPlugin({ protectedPaths: ['/api/'] })
```

**Почему последовательно:**

- **fetch**: Нужен только один ответ на текущий запрос браузера, первый успешный прерывает цепочку. Если никто не вернул ответ — выполняется `fetch(event.request)`
- **push**: Плагин может вернуть `PushNotificationPayload`, `false` (не показывать) или `undefined` (решение отдаётся библиотеке). Библиотека вызывает `showNotification` для каждого payload (параллельно). Не показываем, если все вернули `false` или смесь без payload. Библиотека показывает нотификацию и в случае когда **все** плагины вернули `undefined`.

### 📋 Сводная таблица

| Событие                                                                                            | Выполнение        | Прерывание | Причина                                                                                               |
| -------------------------------------------------------------------------------------------------- | ----------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| `install`                                                                                          | `Параллельно`     | `Нет`      | Независимая инициализация                                                                             |
| `activate`                                                                                         | `Параллельно`     | `Нет`      | Независимая активация                                                                                 |
| `fetch`                                                                                            | `Последовательно` | `Да`       | Нужен один ответ                                                                                      |
| `message`                                                                                          | `Параллельно`     | `Нет`      | Независимые обработчики сообщений                                                                     |
| `sync`                                                                                             | `Параллельно`     | `Нет`      | Независимые задачи                                                                                    |
| `periodicsync`                                                                                     | `Параллельно`     | `Нет`      | Независимые периодические задачи                                                                      |
| `push`                                                                                             | `Последовательно` | `Нет`      | Отображение всех необходимых сообщений                                                                |
| `backgroundfetchsuccess` / `backgroundfetchfail` / `backgroundfetchabort` / `backgroundfetchclick` | Параллельно       | Нет        | События [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API) |

## Примитивы, пресеты и типовые сервис-воркеры

### Примитивы (плагины)

Один примитив — одна операция. Импорт: `@budarin/pluggable-serviceworker/plugins`.
Все примитивы — **фабрики плагинов**: конфиг (если есть) передаётся при вызове по месту использования; в `options` в `initServiceWorker` попадают `version` (обязательно), `pingPath?`, `base?`, `logger?` и `onError?`. Используйте `order` в конфиге плагина для управления порядком выполнения. В конфигах с полем `assets` — пути к ресурсам относительно корня приложения (см. блок про ассеты в описании `base` выше).

| Название                           | Событие    | Описание                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim()`                          | `activate` | Вызывает `clients.claim()`.                                                                                                                                                                                                                                                  |
| `claimAndReloadClients()`          | `activate` | Композиция **claim** + **reloadClients**: сначала claim, затем перезагрузка.                                                                                                                                                            |
| `reloadClients()`                  | `activate` | Перезагружает все окна-клиенты через `client.navigate(client.url)`.                                                                                                                                                                                                          |
| `pruneStaleCache(config)`          | `activate` | Удаляет из кеша записи, чей URL не входит в `config.assets`.                                                                                                                                                                                                                 |
| `cacheFirst(config)`               | `fetch`    | Отдаем ресурс из кэша `config.cacheName`: при отсутствии его в кэше — делаем запрос на сервер и затем кладем ответ в кэш.                                                                                                                                                    |
| `networkFirst(config)`             | `fetch`    | Делаем запрос на сервер, при успехе — кладем его в кеш. При ошибке — отдаем из кеша. Иначе - `undefined`.                                                                                                                                                                    |
| `restoreAssetToCache(config)`      | `fetch`    | Для URL из `config.assets`: отдаёт ресурс из кеша или запрашивает по сети, затем кладёт в кеш. Иначе — undefined.                                                                                                                                                       |
| `serveFromCache(config)`           | `fetch`    | Отдаёт ресурс из кеша `config.cacheName`; при отсутствии его в кэше — undefined.                                                                                                                                                                                             |
| `staleWhileRevalidate(config)`     | `fetch`    | Отдаёт из кэша, в фоне обновляет кэш.                                                                                                                                                                                                                                        |
| `precache(config)`                 | `install`  | Кеширует список ресурсов из `config.assets` в кеш `config.cacheName`.                                                                                                                                                                                                        |
| `precacheWithNotification(config)` | `install`  | Выполняет ту же работу что и **precache** плагин, но сначала отправляет активным клиентам сообщение `startInstallingMessage (по-умолчанию SW_MSG_START_INSTALLING)`, затем кэширует ресурсы и после отправляет сообщение `installedMessage (по-умолчанию SW_MSG_INSTALLED)`. |
| `precacheMissing(config)`          | `install`  | Добавляет в кеш только те ресурсы из `config.assets`, которых ещё нет в кеше.                                                                                                                                                                                                |
| `skipWaiting()`                    | `install`  | Вызывает `skipWaiting()`.                                                                                                                                                                                                                                                    |
| `skipWaitingOnMessage(config?)`    | `message`  | Вступает в силу при получении сообщения с типом messageType (по умолчанию `SW_MSG_SKIP_WAITING`).                                                                                                                                                                            |

#### Композиция примитивов

Обработчики одного типа (`install`, `activate` и т.д.) у разных плагинов выполняются **параллельно**. Если нужна строгая последовательность (например «сначала claim, потом перезагрузка клиентов»), соберите один плагин, который по очереди вызывает логику примитивов — для гарантии порядка.

Пример: claimAndReloadClients как композиция двух примитивов. Плагин вызывает существующие примитивы **claim** и **reloadClients** по очереди:

```ts
import { claim } from '@budarin/pluggable-serviceworker/plugins';
import { reloadClients } from '@budarin/pluggable-serviceworker/plugins';

const claimPlugin = claim();
const reloadPlugin = reloadClients();

activate: async (event, context) => {
    await claimPlugin.activate?.(event, context);
    await reloadPlugin.activate?.(event, context);
},
```

**Пример: кастомный кэш и логика по URL**

Фабрика `postsSwrPlugin(config)` возвращает плагин, который применяет `stale-while-revalidate`(SWR) только к запросам, подходящим под `pathPattern`.

```ts
// postsSwrPlugin.ts
import type { Plugin } from '@budarin/pluggable-serviceworker';
import { staleWhileRevalidate } from '@budarin/pluggable-serviceworker/plugins';

function postsSwrPlugin(config: {
    cacheName: string;
    pathPattern?: RegExp;
}): Plugin {
    const { cacheName, pathPattern = /\/api\/posts(\/|$)/ } = config;
    const swrPlugin = staleWhileRevalidate({ cacheName });

    return {
        name: 'postsSwr',
        order: 0,

        fetch: async (event, context) => {
            if (!pathPattern.test(new URL(event.request.url).pathname)) {
                return undefined;
            }

            return swrPlugin.fetch!(event, context);
        },
    };
}
```

```ts
// sw.ts
const staticCache = 'static-v1';
const assets = ['/', '/main.js'];

initServiceWorker(
    [
        precache({
            cacheName: staticCache,
            assets,
        }),
        serveFromCache({
            cacheName: staticCache,
        }),
        postsSwrPlugin({
            cacheName: 'posts',
        }),
    ],
    {
        version: '1.8.0',
        base: '/my-app/',
        logger: console,
    }
);
```

### Пресеты

Комбинации примитивов (стратегии кеширования). Импорт: `@budarin/pluggable-serviceworker/presets`.

| Название               | Состав                                      | Назначение                                                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| `offlineFirst(config)` | `precache(config) + serveFromCache(config)` | Статика из кеша, при отсутствии ресурса в кэше — делаем запрос к серверу. |

<br />

Конфиг пресета: `OfflineFirstConfig` (cacheName, assets). Импорт из `@budarin/pluggable-serviceworker/presets`.
Стратегии **networkFirst**, **staleWhileRevalidate** и др. доступны как примитивы — собирайте свой кастомный сервис-воркер из примитивов и пресетов.

### Типовые сервис-воркеры (из коробки)

Готовые точки входа по **моменту активации** (все с кешированием offline-first). Импорт: `@budarin/pluggable-serviceworker/sw`.

| Название                              | Описание                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `activateAndUpdateOnNextVisitSW`      | Кеширующий SW, активируется и обновляется при следующем визите на страницу (перезагрузке) после загрузки нового сервисворкера.                         |
| `immediatelyActivateAndUpdateSW`      | Кеширующий SW, всегда активируется и вступает в действие сразу при загрузке и при обновлении.                                                          |
| `immediatelyActivateUpdateOnSignalSW` | Кеширующий SW: первая установка сразу, при обновлении новая версия активируется по сигналу со страницы (сообщение `SW_MSG_SKIP_WAITING` по умолчанию). |

<br />

Пример использования типового SW:

```ts
// sw.js — точка входа вашего сервис-воркера
import { activateAndUpdateOnNextVisitSW } from '@budarin/pluggable-serviceworker/sw';

activateAndUpdateOnNextVisitSW({
    version: '1.8.0',
    cacheName: 'my-cache-v1',
    assets: ['/', '/styles.css', '/script.js'],
    onError: (err, event, type) => console.error(type, err),
});
```

### Публикуемые утилиты

| Название                                                         | Где использовать | Описание                                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerServiceWorkerWithClaimWorkaround(scriptURL, options?)`  | client           | Регистрация SW для случая, когда в activate вызывается claim(); при первом заходе при необходимости один автоматический reload (обход [бага браузера](https://issues.chromium.org/issues/482903583)).                       |
| `onNewServiceWorkerVersion(regOrHandler, onUpdate?)`             | client           | Подписка на появление новой версии SW. Возвращает функцию отписки. Колбэк вызывается, когда новая версия установлена (`installed`) и есть активный контроллер (обновление уже существующего SW, а не первый install).       |
| `onServiceWorkerMessage(messageType, handler)`                   | client           | Подписка на сообщения от SW c указанным `data.type`. Возвращает функцию отписки. Удобно для отображения баннеров "доступна новая версия" и других пользовательских уведомлений.                                             |
| `isServiceWorkerSupported()`                                     | client           | Простая проверка поддержки Service Worker в текущем окружении. Полезно для кода, который может выполняться в SSR / тестах или старых браузерах, чтобы условно включать регистрацию SW и связанные утилиты.                  |
| `postMessageToServiceWorker(message, options?)`                  | client           | Отправляет сообщение в активный Service Worker. Возвращает `Promise<boolean>`: `true`, если сообщение было отправлено (есть `controller` или `active`), `false` — если SW не поддерживается или активного воркера нет.      |
| `sendSkipWaitingSignal()`                                         | client           | Отправляет сигнал skip-waiting **ожидающему** SW (активация по сигналу). Использовать с плагином `skipWaitingOnMessage`. Возвращает `Promise<boolean>`.                                                                   |
| `getServiceWorkerVersion(options?)`                              | client           | Запрашивает у активного SW его версию (поле `version` из `ServiceWorkerInitOptions`). Возвращает `Promise<string \| null>`. Работает через внутренний протокол библиотеки и не требует ручной настройки сообщений.          |
| `pingServiceWorker(options?)`                                    | client           | Выполняет ping-запрос `GET /sw-ping` (обрабатывается плагином `ping`). Будит SW, если он был "усыплён", и проверяет базовую доступность обработчика fetch. Возвращает `'ok' \| 'no-sw' \| 'error'`.                         |
| `isBackgroundFetchSupported()`                                   | client           | Проверка поддержки [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API). Возвращает `Promise<boolean>`.                                                                            |
| `startBackgroundFetch(registration, id, requests, options?)`     | client           | Запуск фоновой загрузки. Возвращает `Promise<BackgroundFetchRegistration>`.                                                                                                                                                 |
| `getBackgroundFetchRegistration(registration, id)`               | client           | Получить регистрацию фоновой загрузки по id. Возвращает `Promise<BackgroundFetchRegistration \| undefined>`.                                                                                                                |
| `abortBackgroundFetch(registration, id)`                         | client           | Отменить фоновую загрузку. Возвращает `Promise<boolean>`.                                                                                                                                                                   |
| `getBackgroundFetchIds(registration)`                            | client           | Список id активных фоновых загрузок. Возвращает `Promise<string[]>`.                                                                                                                                                        |
| `normalizeUrl(url)`                                              | SW               | Нормализует URL (относительный → абсолютный по origin SW) для сравнения.                                                                                                                                                    |
| `resolveAssetUrls(assets, base?)`                                | SW               | Собирает полный адрес из путей в `assets` и base. В `assets` — пути к ресурсам относительно корня приложения (см. выше).                                                                        |
| `isRequestUrlInAssets(requestUrl, assets)`                        | SW               | Проверяет, входит ли адрес запроса в список assets (пути относительно корня приложения; сравнение по нормализованным URL).                                                                        |
| `matchByUrl(cache, request, options?)`                          | SW               | Ищет ответ в кэше по URL (path). Игнорирует mode; по умолчанию игнорирует query (`ignoreSearch: true`) и Vary (`ignoreVary: true`), напр. `/a.js?v=1` находит `/a.js`. См. ниже.                                                                 |
| `notifyClients(messageType, data?, includeUncontrolled = false)` | SW               | Отправляет `{ type: messageType }` или `{ type: messageType, ...data }` всем окнам-клиентам, контролируемым данным SW. Если `includeUncontrolled = true`, дополнительно шлёт сообщение и неконтролируемым вкладкам в scope. |

**`matchByUrl` для сторонних плагинов:** `cache.match(event.request)` сопоставляет по полному запросу (URL + mode + credentials). У запросов с страницы свой mode (скрипты, стили, изображения и т.д.); precache кладёт в кэш с другим mode. Совпадения нет → промах. Используйте `matchByUrl(cache, event.request)` при поиске в кэше по запросу для любых типов ресурсов. Третий аргумент (опционально): `{ ignoreSearch?: boolean; ignoreVary?: boolean }` (оба по умолчанию `true`) — `ignoreSearch` игнорирует query; `ignoreVary` возвращает ответ из кэша даже если у него заголовок `Vary` (напр. `Vary: Origin`), иначе требующий совпадения заголовков запроса. Для строгого совпадения передайте `false`.

**Клиентские подпути (для меньшего бандла):** можно импортировать из `@budarin/pluggable-serviceworker/client/registration`, `.../client/messaging`, `.../client/health` или `.../client/background-fetch` вместо `.../client`, чтобы подтянуть только нужные утилиты.

**Клиентские утилиты — подробная документация (интерфейс, назначение, примеры):** [Регистрация (RU)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.ru.md) | [EN](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.md) · [Сообщения (RU)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.ru.md) | [EN](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.md) · [Доступность и ping (RU)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.ru.md) | [EN](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.md) · [Background Fetch (RU)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.ru.md) | [EN](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.md)

<br />

На странице используйте `registerServiceWorkerWithClaimWorkaround`, чтобы SW корректно взял контроль уже на первой загрузке (если сервисворкер использует `claim()` в сервисворкере) (обход [бага браузера](https://issues.chromium.org/issues/482903583)):
Без него на первом визите страница может остаться без контроллера до перезагрузки.

<br />

```ts
import {
    isServiceWorkerSupported,
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    getServiceWorkerVersion,
    pingServiceWorker,
} from '@budarin/pluggable-serviceworker/client';

if (isServiceWorkerSupported()) {
    const reg = await registerServiceWorkerWithClaimWorkaround('/sw.js');

    // Предложить пользователю обновиться, когда браузер скачал новую версию SW
    const unsubscribeUpdate = onNewServiceWorkerVersion(reg, () => {
        // показать баннер "Доступна новая версия приложения"
    });

    // Реакция на пользовательское сообщение от SW (например, после обновления кэша)
    const unsubscribeMsg = onServiceWorkerMessage(
        'SW_MSG_NEW_VERSION_READY',
        () => {
            // показать баннер "Новая версия установлена, перезагрузите страницу"
        }
    );

    // Пример прямой отправки сообщения в SW (если нужен свой протокол)
    await postMessageToServiceWorker({ type: 'MY_MSG_PING' });

    // Получить текущую версию активного SW (для логирования/отображения в UI)
    const swVersion = await getServiceWorkerVersion();
    console.log('Service Worker version:', swVersion);

    // "Разбудить" SW после долгой паузы (например, на мобильных после разблокировки)
    const pingResult = await pingServiceWorker();
    console.log('Service Worker ping:', pingResult);

    // позже, когда подписка больше не нужна:
    unsubscribeUpdate();
    unsubscribeMsg();
}
```

### 📱 Рецепт: пробуждение SW

На устройствах при долгой паузе процесс SW может быть "усыплён". После при первом взаимодействии страницы с SW (через сообщения) можно получить ошибки, если воркер ещё не "проснулся". Чтобы минимизировать проблемы:

- Используйте `pingServiceWorker()` при `focus`/`visibilitychange`:

```ts
import { pingServiceWorker } from '@budarin/pluggable-serviceworker/client';

window.addEventListener('focus', async () => {
    await pingServiceWorker();
});
```

- При необходимости можно настроить путь ping-запроса через `pingPath` в `initServiceWorker` и опцию `path` в `pingServiceWorker`, чтобы не конфликтовать с существующими маршрутами.

### 📝 Примечание про обход бага Chrome с claim() при 1-й установке сервисворкера

Утилита `registerServiceWorkerWithClaimWorkaround` и связанные с ней примеры предназначены для обхода бага Chrome, описанного мною в issue [`https://issues.chromium.org/issues/482903583`](https://issues.chromium.org/issues/482903583). Как только этот баг будет окончательно исправлен и изменение широко доедет до стабильных версий браузеров, имеет смысл:

- упростить/удалить обход (`registerServiceWorkerWithClaimWorkaround`);
- обновить README и примеры использования, убрав привязку к этому багу.

## Разработка отдельного пакета плагина

Типы для описания плагина экспортируются из этого пакета. Отдельный пакет с плагином не публикует свои типы — он объявляет зависимость от `@budarin/pluggable-serviceworker` и импортирует типы оттуда.

**1. Зависимости в пакете плагина**

В `package.json` своего пакета добавьте:

```json
{
    "peerDependencies": {
        "@budarin/pluggable-serviceworker": "^1.0.0"
    },
    "devDependencies": {
        "@budarin/pluggable-serviceworker": "^1.5.5"
    }
}
```

`peerDependencies` — чтобы плагин работал с той версией библиотеки, которую установил пользователь; в `devDependencies` — для сборки и типов.

**2. Импорт типов в коде плагина**

Импортируйте тип **`Plugin`** (алиас для `ServiceWorkerPlugin<PluginContext>`); при необходимости — `Logger`, `SwMessageEvent`, `PushNotificationPayload` и др.

```typescript
import type { Plugin } from '@budarin/pluggable-serviceworker';
import { matchByUrl } from '@budarin/pluggable-serviceworker/utils';

export interface MyPluginConfig {
    cacheName: string;
    order?: number;
}

export function myPlugin(config: MyPluginConfig): Plugin {
    const { cacheName, order = 0 } = config;

    return {
        order,
        name: 'my-plugin',

        install: async (_event, context) => {
            context.logger?.info('my-plugin: install');
            const cache = await caches.open(cacheName);
            await cache.add('/offline.html');
        },

        fetch: async (event) => {
            const cache = await caches.open(cacheName);
            const cached = await matchByUrl(cache, event.request);
            return cached ?? undefined;
        },
    };
}
```

## Плагины

Готовые плагины подключаются отдельными зависимостями и передаются в `initServiceWorker` вместе с остальными:

| Плагин                                                                                                                   | Назначение                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [**@budarin/psw-plugin-serve-root-from-asset**](https://www.npmjs.com/package/@budarin/psw-plugin-serve-root-from-asset) | Отдаёт из кеша заданный HTML-ассет на навигацию к корню (`/`) — типичный сценарий для SPA.                                               |
| [**@budarin/psw-plugin-serve-range-requests**](https://www.npmjs.com/package/@budarin/psw-plugin-serve-range-requests)   | Обслуживает Range-запросы по кэшированным файлам (видео, аудио, PDF): ответы 206, перемотка и стриминг из кеша.                          |
| [**@budarin/psw-plugin-opfs-serve-range**](https://www.npmjs.com/package/@budarin/psw-plugin-opfs-serve-range)           | Отдаёт диапазонные запросы (Range) по файлам, лежащим в Origin Private File System (OPFS) — удобно для оффлайн‑хранилищ и тяжёлых медиа. |

Установка и API — в README каждого плагина на npm.

## 📄 Лицензия

MIT © Vadim Budarin
