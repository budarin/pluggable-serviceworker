# @budarin/pluggable-serviceworker

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/README.ru.md)

A library for building modular, pluggable Service Workers.

> Production-oriented: typed API, predictable plugin execution order, centralized error handling, built-in version/ping mechanisms, and ready-made activation scenarios let you use it safely in real-world frontend projects.

[![CI](https://github.com/budarin/pluggable-serviceworker/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/budarin/pluggable-serviceworker/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@budarin/pluggable-serviceworker?color=cb0000)](https://www.npmjs.com/package/@budarin/pluggable-serviceworker)
[![npm](https://img.shields.io/npm/dt/@budarin/pluggable-serviceworker)](https://www.npmjs.com/package/@budarin/pluggable-serviceworker)
[![bundle](https://img.shields.io/bundlephobia/minzip/@budarin/pluggable-serviceworker)](https://bundlephobia.com/result?p=@budarin/pluggable-serviceworker)
[![GitHub](https://img.shields.io/github/license/budarin/pluggable-serviceworker)](https://github.com/budarin/pluggable-serviceworker)

## Table of contents

- [Why this package?](#-why-this-package)
    - [Modular architecture](#-modular-architecture)
    - [Predictable execution order](#-predictable-execution-order)
    - [Easy to learn](#-easy-to-learn)
    - [Small footprint](#-small-footprint)
    - [Full control](#-full-control)
    - [Centralized error handling](#-centralized-error-handling)
    - [Logging](#-logging)
    - [Ready-made building blocks](#-ready-made-building-blocks)
- [Installation](#-installation)
- [Quick start](#-quick-start)
    - [Basic usage](#basic-usage)
- [Demo](#demo)
- [initServiceWorker(plugins, options)](#initserviceworkerplugins-options)
- [initServiceWorker options](#️-initserviceworker-options-version-pingpath-base-logger-onerror-passthroughrequestheader)
    - [Option fields](#option-fields)
    - [Error handling](#error-handling)
- [Plugins](#plugins)
    - [Plugin interface](#-plugin-interface)
    - [Method summary](#-method-summary)
    - [Handler behaviour](#-handler-behaviour)
- [Plugin execution order](#-plugin-execution-order)
    - [Example](#example)
- [Handler execution behaviour](#-handler-execution-behaviour)
    - [Parallel execution](#-parallel-execution)
    - [Sequential execution](#️-sequential-execution)
    - [Summary table](#-summary-table)
- [Primitives, presets, and ready-made service workers](#primitives-presets-and-ready-made-service-workers)
    - [Primitives (plugins)](#primitives-plugins)
    - [Presets](#presets)
    - [Ready-made service workers](#ready-made-service-workers)
    - [Published utilities](#published-utilities)
    - [Recipe: waking up the SW](#-recipe-waking-up-the-sw)
    - [Note on Chrome claim() workaround](#-note-on-chrome-claim-workaround)
- [Developing a separate plugin package](#developing-a-separate-plugin-package)
- [Plugins (ready-made)](#plugins-ready-made)
- [License](#-license)

## 🚀 Why this package?

Service workers are powerful but easy to get wrong: many event handlers, error paths, race conditions, and browser quirks. Large frameworks help, but often bring their own routing model, strategy DSL, and a lot of concepts to keep in your head. This package focuses on a smaller surface: a typed plugin contract, predictable execution, and tools that stay close to the native Service Worker API.

### 🔌 **Modular architecture**

- **Plugins as building blocks** — each plugin owns one concern (caching, auth, notifications, version checks).
- You compose a service worker from small pieces instead of one large script.
- Infrastructure code for events (`install`, `activate`, `fetch`, …) lives in the library; your code focuses on behaviour.

### 🎯 **Predictable execution order**

- Plugins are sorted by `order` (ascending, default `0`) before handlers are registered.
- For `fetch` the chain is **sequential**: the first plugin that returns a non‑`undefined` `Response` wins.
- For `push` all handlers run; for most other events (`install`, `activate`, `message`, `sync`, `periodicsync`, background fetch events and others) handlers run **in parallel**.
- Event listeners are only registered when at least one plugin provides a handler for that event.

### 📖 **Easy to learn**

- One main concept: `Plugin` with optional hooks; no separate routing language or strategy objects.
- Few moving parts: plugin, plugin factory, `initServiceWorker`, options.
- The `ServiceWorkerPlugin` type acts as an executable contract and documentation at the same time.

### 📦 **Small footprint**

- Minimal runtime with no bundled build system or large dependencies.
- Only the code you import is included in your bundle.
- Suitable for projects where bundle size and dependency graph are tightly controlled.

### 🎛 **Full control**

- You decide what to cache and how to update it.
- Plugin order, logging, and error handling are configured explicitly.
- If you need a non‑standard behaviour, you implement it directly in a plugin instead of working around a framework.

### 🛡️ **Centralized error handling**

- A single `onError` hook receives structured information about where and what failed.
- Errors in one plugin do not break others; errors from global Service Worker events are handled in one place.
- Error types are typed so you can react differently to installation, activation, fetch, or background fetch failures.

### 📝 **Logging**

- Pluggable logger with levels (`trace`, `debug`, `info`, `warn`, `error`).
- The same context (logger, base) is passed into every plugin hook, which makes it easier to correlate logs and resolve asset paths across events.
- You can use your own logging infrastructure as long as it matches the expected interface.

### ✅ **Ready‑made building blocks**

- A set of ready‑to‑use plugins: `precache`, `cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `skipWaiting`, `claim`, and others.
- `offlineFirst` preset that combines precache on install with cache‑first fetch behaviour.
- Ready‑made service worker entry points: `activateOnSignal`, `activateImmediately`, `activateOnNextVisit`.
- Client utilities for registration, update detection, messaging, health checks, and Background Fetch — with a focus on predictable behaviour and minimal boilerplate.

## 📦 Installation

```bash
npm install @budarin/pluggable-serviceworker
```

or

```bash
pnpm add @budarin/pluggable-serviceworker
```

## 🚀 Quick start

### Basic usage

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

**Why `matchByUrl` instead of `cache.match(event.request)`?** The browser sends requests with different `mode` (scripts, styles, images, etc. each have their own); precache stores with a different mode. `cache.match()` requires a full match (URL, mode, credentials) — no match, hence "Failed to fetch". `matchByUrl()` matches by URL path only (and by default ignores query string, so `/a.js?v=1` finds the entry for `/a.js`). Use it in the fetch handler when looking up any resource in the cache by request.

## Demo

The [demo/](demo/) folder contains a **React + Vite** app with the **offlineFirst** preset and **activateOnSignal** SW. From repo root: `pnpm start`. See [demo/README.md](demo/README.md).

## initServiceWorker(plugins, options)

`initServiceWorker` is the entry point: it registers Service Worker event handlers (`install`, `activate`, `fetch`, …) and runs them through the plugin list. **Only events that have at least one plugin handler are registered** — if no plugin implements e.g. `sync`, the service worker will not listen for `sync` events.

- **`plugins`** — array of plugin objects. Plugins with config come from **factory** calls at the call site (see "Plugin factory"). Entries that are `null` or `undefined` (e.g. when a factory returns `undefined` because an API is unavailable) are ignored; no need to filter the array yourself.
- **`options`** — at least `version` (required), and optional `pingPath?`, `base?`, `logger?`, `onError?`. The **context** (logger, base) is passed as the second argument to plugin handlers.

**Example:**

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

## ⚙️ initServiceWorker options (version, pingPath, base, logger, onError, passthroughRequestHeader)

The second parameter `options` is of type `ServiceWorkerInitOptions`: required `version` and optional `pingPath?`, `base?`, `logger?`, `onError?`, `passthroughRequestHeader?`. The **context** (logger, base) is passed into plugin handlers (second argument); if logger is omitted, `console` is used. `onError` is used only by the library, not passed to plugins.

`PluginContext` in the API is for typing; plugins receive it as the second argument.

```ts
interface PluginContext {
    logger?: Logger;            // default: console
    base?: string;              // app base path
    passthroughHeader?: string; // header name for passthrough requests (default: PSW_PASSTHROUGH_HEADER)
    fetchPassthrough?: (request: Request) => Promise<Response>; // fetch that bypasses all plugins
}

interface ServiceWorkerInitOptions extends PluginContext {
    /** Service worker / app version string (e.g. '1.8.0'). */
    version: string;

    /** Optional path for ping requests (default '/sw-ping'). */
    pingPath?: string;

    /**
     * Header name that marks a request as passthrough:
     * such requests bypass all plugins and are handled by the browser directly.
     * Default: PSW_PASSTHROUGH_HEADER ('X-PSW-Passthrough').
     */
    passthroughRequestHeader?: string;

    onError?: (error, event, errorType?) => void; // library only, not passed to plugins
}
```

### Option fields

#### `version: string` (required)

Version string for the service worker / app. Used by:

- the library's internal plugin that answers version requests (`getServiceWorkerVersion()` on the client);
- logging and debugging (you can log it in your `onError` or logger).

Recommend using the same string as your frontend app version (e.g. from `package.json`).

**Example:**

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
});
```

#### `base?: string` (optional)

App base path, e.g. `'/'` or `'/my-app/'`. Used by asset plugins (`precache`, `restoreAssetToCache`, etc.) to resolve asset URLs. When the app is deployed under a subpath, pass the same base as in your build config so cached URLs match incoming requests.

**Example:**

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
    base: '/',
});
```

For an app under a subpath, use the same base as in your build config.

**Example for Vite:** use `base: import.meta.env.BASE_URL` so it matches `vite.config` → `base`.

#### `pingPath?: string` (optional)

Overrides the ping path handled by the library's internal ping plugin. Default is `'/sw-ping'` (constant `SW_PING_PATH`). This must match what you use on the client in `pingServiceWorker({ path: ... })` if you change it.

**Examples:**

```ts
// Default — internal plugin handles GET /sw-ping
initServiceWorker(plugins, {
    version: '1.8.0',
});

// Custom ping path (e.g. to avoid clashing with backend)
initServiceWorker(plugins, {
    version: '1.8.0',
    pingPath: '/internal/sw-ping',
});
```

#### `passthroughRequestHeader?: string` (optional)

**The problem.** When a plugin makes an internal `fetch()` — for example, `staleWhileRevalidate` fetches a fresh copy to update the cache, or an analytics plugin sends an event — that request re-enters the Service Worker's `fetch` handler and goes through all plugins again. This can cause infinite recursion or an "internal" request being served from cache instead of going to the network.

**The solution.** Use `context.fetchPassthrough(request)` instead of a bare `fetch()`. The library routes the request directly to the network, bypassing all plugins, using an origin-aware strategy:

- **cross-origin request** — `fetch(request)` is called without any modification. A SW never intercepts its own cross-origin fetches (they are outside its scope), so there is no re-entry and no CORS preflight.
- **same-origin request** — the passthrough header is added to a `Request` clone. This prevents re-entry into the SW's `fetch` handler. No CORS issue — same-origin requests never trigger a preflight.

The header `passthroughRequestHeader` is an alternative mechanism for cases where requests arrive **from outside** the SW (e.g. another script) already carrying the marker. Default is `PSW_PASSTHROUGH_HEADER` (`'X-PSW-Passthrough'`).

**How to make a network request inside your plugin** — always call `context.fetchPassthrough`:

```ts
fetch: async (event, context) => {
    // ✅ correct — bypasses the plugin chain, no CORS issues
    const response = await context.fetchPassthrough!(event.request);
    // ...
}
```

**Never** call bare `fetch()` for internal requests — the response will re-enter the handler and loop through all plugins again:

```ts
fetch: async (event, context) => {
    // ❌ wrong — re-enters the plugin chain
    const response = await fetch(event.request);
}
```

The built-in plugins (`cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `restoreAssetToCache`) all use `context.fetchPassthrough` internally.

**Custom header name** (useful to avoid clashes with other headers):

```ts
initServiceWorker(plugins, {
    version: '1.8.0',
    passthroughRequestHeader: 'X-My-Internal',
});
```

#### `logger?: Logger` (optional)

Logger object with `info`, `warn`, `error`, `debug`. Default is `console`. Any object implementing the `Logger` interface is accepted.

```ts
interface Logger {
    trace: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
}
```

**Example:**

```ts
const options = {
    logger: customLogger,
    // or
    logger: {
        trace: (...data) => customLogger('TRACE', ...data),
        debug: (...data) => customLogger('DEBUG', ...data),
        info: (...data) => customLogger('INFO', ...data),
        warn: (...data) => customLogger('WARN', ...data),
        error: (...data) => customLogger('ERROR', ...data),
    },
};
```

#### `onError?: (error, event, errorType) => void` (optional)

Single handler for all error types in the Service Worker. **There is no default handler** — if `onError` is not provided, errors are not handled.

**Parameters:**

- `error: Error | any` — error object
- `event: Event` — event where the error occurred
- `errorType?: ServiceWorkerErrorType` — error type (see "Error handling")

**Important:** If `onError` is not set, plugin and global errors are not handled. For production, always set `onError` for logging and monitoring.

**Examples:**

```ts
// Minimal: version only
initServiceWorker([cachePlugin], {
    version: '1.8.0',
});

// With onError
initServiceWorker([cachePlugin], {
    version: '1.8.0',
    onError: (error, event, errorType) => {
        console.error('Service Worker error:', error, errorType);
    },
});
```

### Error handling

The library lets you define one handler for all error types and handle each type as needed. It subscribes to global `error`, `messageerror`, `unhandledrejection`, `rejectionhandled`; an error in one plugin does not stop others. If `onError` throws, the exception is logged via `options.logger`.

```ts
import {
    initServiceWorker,
    serviceWorkerErrorTypes,
} from '@budarin/pluggable-serviceworker';

const logger = console; // or your own logger

const options = {
    version: '1.8.0',
    logger,
    onError: (error, event, errorType) => {
        logger.info(`Error type "${errorType}":`, error);

        switch (errorType) {
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
                if (error instanceof Error && error.stack) {
                    logger.error('Plugin error Stack:', error.stack);
                }
                break;

            case serviceWorkerErrorTypes.ERROR:
                logger.error('JavaScript error:', error);
                break;

            case serviceWorkerErrorTypes.MESSAGE_ERROR_HANDLER:
                logger.error('Message error:', error);
                break;

            case serviceWorkerErrorTypes.UNHANDLED_REJECTION:
                logger.error('Unhandled promise rejection:', error);
                break;

            case serviceWorkerErrorTypes.REJECTION_HANDLED:
                logger.info('Promise rejection handled:', error);
                break;

            default:
                logger.error('Unknown error type:', error);
                fetch('/api/errors', {
                    method: 'POST',
                    body: JSON.stringify({
                        error: error.message,
                        eventType: event.type,
                        url: event.request?.url,
                        timestamp: Date.now(),
                    }),
                }).catch(() => {});
        }
    },
};

initServiceWorker(
    [
        /* your plugins */
    ],
    options
);
```

## Plugins

A **plugin** is an object with a `name` and optional handlers (`install`, `fetch`, `activate`, etc.). You pass such objects into `initServiceWorker(plugins, options)`.

A **plugin factory** is a function that takes config and returns a plugin (e.g. `precache(config)`, `serveFromCache(config)`, or your own `precacheAndServePlugin(config)`). Config is set at the call site.

### 🔌 Plugin interface

A plugin implements `ServiceWorkerPlugin`. Plugin-specific config is set when calling the **factory**. The `_C` type parameter is for typing the context.

**Context** (`PluginContext`) — the second argument of every handler. Passed from `initServiceWorker(plugins, options)`; option fields become context:

```ts
interface PluginContext {
    logger?: Logger;            // Logger (default: console).
    base?: string;              // App base path.
    passthroughHeader?: string; // Header name for passthrough requests (default: PSW_PASSTHROUGH_HEADER).
    fetchPassthrough?: (request: Request) => Promise<Response>; // fetch that bypasses all plugins, no CORS issues.
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

### 📝 Method summary

| Method                   | Event                    | Returns                                         | Description                                                                                                      |
| ------------------------ | ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `install`                | `install`                | `void`                                          | Plugin init on SW install                                                                                        |
| `activate`               | `activate`               | `void`                                          | Plugin activation on SW update                                                                                   |
| `fetch`                  | `fetch`                  | `Response \| undefined`                         | Handle network requests                                                                                          |
| `message`                | `message`                | `void`                                          | Handle messages from main thread                                                                                 |
| `sync`                   | `sync`                   | `void`                                          | Background sync                                                                                                  |
| `push`                   | `push`                   | `PushNotificationPayload \| false \| undefined` | Handle and show push notification                                                                                |
| `periodicsync`           | `periodicsync`           | `void`                                          | Periodic background tasks                                                                                        |
| `backgroundfetchsuccess` | `backgroundfetchsuccess` | `void`                                          | [Background Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API): all fetches succeeded |
| `backgroundfetchfail`    | `backgroundfetchfail`    | `void`                                          | Background Fetch: at least one fetch failed                                                                      |
| `backgroundfetchabort`   | `backgroundfetchabort`   | `void`                                          | Background Fetch: fetch aborted by user or app                                                                   |
| `backgroundfetchclick`   | `backgroundfetchclick`   | `void`                                          | Background Fetch: user clicked download UI                                                                       |

How the package works:

- `null` and `undefined` entries in the plugins array are ignored (e.g. when a factory returns `undefined` when an API is unavailable). No need to filter manually
- Arrays are created for each event type: install, activate, fetch, message, sync, periodicsync, push, backgroundfetchsuccess, backgroundfetchfail, backgroundfetchabort, backgroundfetchclick
- Plugins are sorted by `order` (ascending, default 0)
- In that order, each plugin's handlers are pushed into the corresponding arrays
- **Only event types that have at least one handler get a listener** — `addEventListener` is called only for those
- **Background Fetch**: listeners for `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick` are registered only when the browser supports the API (`'backgroundFetch' in self.registration`). If plugins registered BF handlers but the API is not supported, a warning is logged.
- When an event fires in the service worker, handlers from the matching array are run

### 🎯 Handler behaviour

- Every method receives `event` as the first argument and **context** (logger, base) as the second.
- **`fetch`**: return `Response` to end the chain or `undefined` to pass to the next plugin. If all return `undefined`, the framework calls `fetch(event.request)`.
- **`push`**: may return `PushNotificationPayload` (for [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)), `false` (do not show), or `undefined` (library decides). All `push` handlers run. For each `PushNotificationPayload` result, `showNotification` is called (multiple notifications are shown in parallel). No notification if all return `false` or only `undefined`/`false` without payload. The library shows one notification **only when all** plugins return `undefined` (and there is payload to show).
- **Other handlers** (`install`, `activate`, `message`, `sync`, `periodicsync`, `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick`): return value is ignored; the framework calls each plugin's method in order; the chain does not short-circuit.
- **All handlers are optional** — implement only the events you need. If no plugin implements a given event, that event is not listened for in the service worker.

## 🎯 Plugin execution order

Plugins are sorted by `order` (ascending). If `order` is not specified, it defaults to `0`.

**Important:** Order matters for:

- **`fetch`** — handlers run sequentially; first plugin that returns a `Response` stops the chain
- **`push`** — handlers run sequentially

For other events (`install`, `activate`, `message`, `sync`, `periodicsync`, `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick`), handlers run **in parallel**, so order is mainly for organizing your configuration.

### Example:

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
            order: -10, // Early
        }),
        serveFromCache({
            cacheName: 'v1', // order defaults to 0
        }),
        cacheFirst({
            cacheName: 'api',
            order: 100, // Late
        }),
    ],
    {
        version: '1.8.0',
        base: '/',
    }
);

// Execution order: precache (order -10) → serveFromCache (order 0) → cacheFirst (order 100)
```

**Recommendations for using `order`:**

In most cases, you can do without explicitly specifying `order` — just place plugins in the array in the order you want them to execute. All plugins default to `order = 0`, so they will execute in registration order.

Explicit `order` is useful in edge cases when you need to:

- If you use presets with unknown pluggins order in it
- Use plugins from different sources and control their relative order
- Organize plugins into groups (early, regular, late)

**Recommended order ranges:**

- **`-100…-1`** — Early plugins (logging, metrics, tracing)
- **`0`** — Regular plugins (default)
- **`1…100`** — Late plugins (fallbacks, final handlers)

## ⚡ Handler execution behaviour

Different Service Worker events are handled differently:

### 🔄 Parallel execution

**Events:** `install`, `activate`, `message`, `sync`, `periodicsync`

All handlers run **in parallel** via `Promise.all()`:

```ts
import {
    precache,
    skipWaiting,
    precacheMissing,
} from '@budarin/pluggable-serviceworker/plugins';

import { customLogger } from '../customLogger';
import { initServiceWorker } from '@budarin/pluggable-serviceworker';

// All install handlers run in parallel
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

**Why parallel:**

- **install/activate**: All plugins initialize independently
- **message**: All plugins receive the message
- **sync**: Independent sync tasks
- **periodicsync**: Independent periodic tasks

### ➡️ Sequential execution

**Events:** `fetch`, `push`

Handlers run **one after another**:

#### Fetch — chain can short-circuit

`fetch` handlers are called in order. A plugin can return `Response` — then the chain stops and that response is used. Or return `undefined` — then the next plugin is tried. If **all** return `undefined`, the framework calls `fetch(event.request)`.

Example factory that short-circuits for unauthorized access to protected paths:

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

                    return new Response('Unauthorized', { status: 401 }); // Stops chain
                }
            }

            return undefined; // Pass to next plugin
        },
    };
}

// using: authPlugin({ protectedPaths: ['/api/'] })
```

**Why sequential:**

- **fetch**: Only one response per request; first non-undefined stops the chain. If none returns a response, `fetch(event.request)` is used
- **push**: Plugin can return `PushNotificationPayload`, `false`, or `undefined`. The library calls `showNotification` for each payload (in parallel). It shows one notification when **all** plugins return `undefined`

### 📋 Summary table

| Event                                                                                              | Execution  | Short-circuit | Reason                                                                                               |
| -------------------------------------------------------------------------------------------------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `install`                                                                                          | Parallel   | No            | Independent init                                                                                     |
| `activate`                                                                                         | Parallel   | No            | Independent activation                                                                               |
| `fetch`                                                                                            | Sequential | Yes           | Single response                                                                                      |
| `message`                                                                                          | Parallel   | No            | Independent handlers                                                                                 |
| `sync`                                                                                             | Parallel   | No            | Independent tasks                                                                                    |
| `periodicsync`                                                                                     | Parallel   | No            | Independent periodic                                                                                 |
| `push`                                                                                             | Sequential | No            | Show all needed notifications                                                                        |
| `backgroundfetchsuccess` / `backgroundfetchfail` / `backgroundfetchabort` / `backgroundfetchclick` | Parallel   | No            | [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API) events |

## Primitives, presets, and ready-made service workers

### Primitives (plugins)

One primitive = one operation. Import from `@budarin/pluggable-serviceworker/plugins`.
All primitives are **plugin factories**: config (if any) is passed at the call site; `initServiceWorker` options are `version` (required), `pingPath?`, `base?`, `logger?`, `onError?`. Use `order` in plugin config to control execution order.

| Name                               | Event      | Description                                                                                                                                                                  |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim()`                          | `activate` | Calls `clients.claim()`.                                                                                                                                                     |
| `claimAndReloadClients()`          | `activate` | **claim** + **reloadClients** in one plugin (order guaranteed).                                                                                                              |
| `reloadClients()`                  | `activate` | Reloads all client windows.                                                                                                                                                  |
| `pruneStaleCache(config)`          | `activate` | Removes cache entries whose URL is not in `config.assets`.                                                                                                                   |
| `cacheFirst(config)`               | `fetch`    | Serve from cache `config.cacheName`; on miss, fetch and cache.                                                                                                               |
| `networkFirst(config)`             | `fetch`    | Fetch from network, on success cache. On error serve from cache. Otherwise undefined.                                                                                        |
| `restoreAssetToCache(config)`      | `fetch`    | For URLs in `config.assets`: serve from cache or fetch and put in cache. Otherwise undefined.                                                                                |
| `serveFromCache(config)`           | `fetch`    | Serves from cache `config.cacheName`; if missing, returns undefined.                                                                                                         |
| `staleWhileRevalidate(config)`     | `fetch`    | Serve from cache, revalidate in background.                                                                                                                                  |
| `precache(config)`                 | `install`  | Caches `config.assets` in cache `config.cacheName`.                                                                                                                          |
| `precacheWithNotification(config)` | `install`  | Same as **precache**, plus sends `startInstallingMessage` (default `SW_MSG_START_INSTALLING`) to clients, then caches, then `installedMessage` (default `SW_MSG_INSTALLED`). |
| `precacheMissing(config)`          | `install`  | Adds to cache only assets from `config.assets` that are not yet cached.                                                                                                      |
| `skipWaiting()`                    | `install`  | Calls `skipWaiting()`.                                                                                                                                                       |
| `skipWaitingOnMessage(config?)`    | `message`  | Triggers on message with `messageType` (default `SW_MSG_SKIP_WAITING`).                                                                                                      |

#### Composing primitives

Handlers of the same type from different plugins run **in parallel**. For strict order (e.g. claim then reload clients), use one plugin that calls the primitives in sequence:

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

**Example: custom cache and URL logic**

Factory `postsSwrPlugin(config)` returns a plugin that applies `stale-while-revalidate` only to requests matching `pathPattern`:

```ts
// postsSwrPlugin.ts
import type { Plugin } from '@budarin/pluggable-serviceworker';
import { staleWhileRevalidate } from '@budarin/pluggable-serviceworker/plugins';

function postsSwrPlugin(config: {
    cacheName: string;
    pathPattern?: RegExp;
    order?: number;
}): Plugin {
    const { cacheName, pathPattern = /\/api\/posts(\/|$)/, order = 0 } = config;
    const swrPlugin = staleWhileRevalidate({ cacheName });

    return {
        order,
        name: 'postsSwr',

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

### Presets

Combinations of primitives. Import from `@budarin/pluggable-serviceworker/presets`.

| Name                   | Contents                                    | Purpose                                        |
| ---------------------- | ------------------------------------------- | ---------------------------------------------- |
| `offlineFirst(config)` | `precache(config) + serveFromCache(config)` | Serve from cache; on miss, fetch from network. |

<br />

Preset config: `OfflineFirstConfig` (cacheName, assets). Import from `@budarin/pluggable-serviceworker/presets`.
Strategies like **networkFirst**, **staleWhileRevalidate** are available as primitives — build your own SW from primitives and presets.

### Ready-made service workers

Pre-built entry points by **activation moment** (all with offline-first caching). Import from `@budarin/pluggable-serviceworker/sw`.

| Name                                  | Description                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `activateAndUpdateOnNextVisitSW`      | Caching SW; activates and updates on next page visit (reload) after new SW is loaded.                                                 |
| `immediatelyActivateAndUpdateSW`      | Caching SW; activates immediately on load and on update.                                                                              |
| `immediatelyActivateUpdateOnSignalSW` | Caching SW: first install is immediate; on update, new version activates on signal from page (default message `SW_MSG_SKIP_WAITING`). |

<br />

Example:

```ts
// sw.js — your service worker entry
import { activateAndUpdateOnNextVisitSW } from '@budarin/pluggable-serviceworker/sw';

activateAndUpdateOnNextVisitSW({
    version: '1.8.0',
    cacheName: 'my-cache-v1',
    assets: ['/', '/styles.css', '/script.js'],
    onError: (err, event, type) => console.error(type, err),
});
```

### Published utilities

| Name                                                             | Use in | Description                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerServiceWorkerWithClaimWorkaround(scriptURL, options?)`  | client | Register SW when activate calls claim(); optional one-time reload on first load (workaround for [browser bug](https://issues.chromium.org/issues/482903583)).                               |
| `onNewServiceWorkerVersion(regOrHandler, onUpdate?)`             | client | Subscribe to new SW version. Returns an unsubscribe function. Callback when new version is installed and there is an active controller (update, not first install).                         |
| `onServiceWorkerMessage(messageType, handler)`                   | client | Subscribe to messages from SW with given `data.type`. Returns an unsubscribe function. E.g. "new version available" banners.                                                                |
| `isServiceWorkerSupported()`                                     | client | Check if Service Worker is supported. Useful for SSR/tests/old browsers.                                                                                                                    |
| `postMessageToServiceWorker(message, options?)`                  | client | Send message to active Service Worker. Returns `Promise<boolean>`.                                                                                                                          |
| `getServiceWorkerVersion(options?)`                              | client | Get active SW version (`version` from `ServiceWorkerInitOptions`). Returns `Promise<string \| null>`.                                                                                       |
| `pingServiceWorker(options?)`                                    | client | GET /sw-ping (handled by ping plugin). Wakes SW if sleeping, checks fetch availability. Returns `'ok' \| 'no-sw' \| 'error'`.                                                               |
| `isBackgroundFetchSupported()`                                   | client | Check if [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API) is available. Returns `Promise<boolean>`.                                            |
| `startBackgroundFetch(registration, id, requests, options?)`     | client | Start a background fetch. Returns `Promise<BackgroundFetchRegistration>`.                                                                                                                   |
| `getBackgroundFetchRegistration(registration, id)`               | client | Get background fetch registration by id. Returns `Promise<BackgroundFetchRegistration \| undefined>`.                                                                                       |
| `abortBackgroundFetch(registration, id)`                         | client | Abort a background fetch. Returns `Promise<boolean>`.                                                                                                                                       |
| `getBackgroundFetchIds(registration)`                            | client | List ids of active background fetches. Returns `Promise<string[]>`.                                                                                                                         |
| `normalizeUrl(url)`                                              | SW     | Normalize URL (relative → absolute by SW origin) for comparison.                                                                                                                            |
| `resolveAssetUrls(assets, base?)`                                | SW     | Resolve asset paths with base. Returns full URLs.                                                                                               |
| `isRequestUrlInAssets(requestUrl, assets)`                        | SW     | Check if request URL is in the asset list (normalized comparison).                                                                                                                          |
| `matchByUrl(cache, request, options?)`                          | SW     | Match cached response by URL path. Ignores request mode; by default ignores query (`ignoreSearch: true`) and Vary (`ignoreVary: true`), so e.g. `/a.js?v=1` finds `/a.js`. See below. |
| `notifyClients(messageType, data?, includeUncontrolled = false)` | SW     | Send `{ type: messageType }` or `{ type: messageType, ...data }` to all client windows controlled by this SW. If `includeUncontrolled = true`, also sends to uncontrolled windows in scope. |

**`matchByUrl` for third-party plugins:** `cache.match(event.request)` matches by full request (URL + mode + credentials). Page requests have their own mode (scripts, styles, images, etc.); precache stores with a different mode. No match → cache miss. Use `matchByUrl(cache, event.request)` when looking up any resource in the cache by request. Optional third argument: `{ ignoreSearch?: boolean; ignoreVary?: boolean }` (both default `true`) — `ignoreSearch` ignores the query string; `ignoreVary` returns cached responses even when the response's `Vary` header would otherwise require matching request headers (e.g. `Vary: Origin`). Set to `false` for strict matching.

**Client subpaths (for smaller bundles):** you can import from `@budarin/pluggable-serviceworker/client/registration`, `.../client/messaging`, `.../client/health`, or `.../client/background-fetch` instead of `.../client` to pull in only the utilities you need.

**Client utilities — detailed docs (interface, purpose, examples):** [Registration (EN)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.md) | [RU](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.ru.md) · [Messaging (EN)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.md) | [RU](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.ru.md) · [Health (EN)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.md) | [RU](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.ru.md) · [Background Fetch (EN)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.md) | [RU](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.ru.md)

<br />

Use `registerServiceWorkerWithClaimWorkaround` on the page so the SW takes control on first load when using `claim()` (workaround for [browser bug](https://issues.chromium.org/issues/482903583)). Without it, the page may have no controller until reload.

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

    const unsubscribeUpdate = onNewServiceWorkerVersion(reg, () => {
        // show "New version available" banner
    });

    const unsubscribeMsg = onServiceWorkerMessage(
        'SW_MSG_NEW_VERSION_READY',
        () => {
            // show "New version installed, reload" banner
        }
    );

    await postMessageToServiceWorker({ type: 'MY_MSG_PING' });

    const swVersion = await getServiceWorkerVersion();
    console.log('Service Worker version:', swVersion);

    const pingResult = await pingServiceWorker();
    console.log('Service Worker ping:', pingResult);

    // later, when you no longer need the subscriptions:
    unsubscribeUpdate();
    unsubscribeMsg();
}
```

### 📱 Recipe: waking up the SW

On devices, the SW process can be suspended. After a long idle, the first interaction (e.g. messages) may fail until the worker wakes. To reduce issues:

- Call `pingServiceWorker()` on `focus` / `visibilitychange`:

```ts
import { pingServiceWorker } from '@budarin/pluggable-serviceworker/client';

window.addEventListener('focus', async () => {
    await pingServiceWorker();
});
```

- Optionally set the ping path via `pingPath` in `initServiceWorker` and `path` in `pingServiceWorker` to avoid clashing with existing routes.

### 📝 Note on Chrome claim() workaround

`registerServiceWorkerWithClaimWorkaround` and related examples work around a Chrome bug reported in [issue 482903583](https://issues.chromium.org/issues/482903583). Once the bug is fixed and widely shipped, consider simplifying or removing the workaround and updating the README and examples.

## Developing a separate plugin package

Plugin types are exported from this package. A separate plugin package does not publish its own types — it declares a dependency on `@budarin/pluggable-serviceworker` and imports types from it.

**1. Plugin package dependencies**

In your package's `package.json`:

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

`peerDependencies` so the plugin works with the user's library version; `devDependencies` for build and types.

**2. Importing types in the plugin**

Import type **`Plugin`** (alias for `ServiceWorkerPlugin<PluginContext>`); and if needed `Logger`, `SwMessageEvent`, `PushNotificationPayload`, etc.

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

## Plugins (ready-made)

Ready-made plugins are installed as separate dependencies and passed into `initServiceWorker` along with the rest:

| Plugin                                                                                                                   | Purpose                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [**@budarin/psw-plugin-serve-root-from-asset**](https://www.npmjs.com/package/@budarin/psw-plugin-serve-root-from-asset) | Serves a chosen cached HTML asset for root (`/`) navigation — typical SPA setup.                                                  |
| [**@budarin/psw-plugin-serve-range-requests**](https://www.npmjs.com/package/@budarin/psw-plugin-serve-range-requests)   | Handles Range requests for cached files (video, audio, PDF): 206 responses, seeking and streaming from cache.                     |
| [**@budarin/psw-plugin-opfs-serve-range**](https://www.npmjs.com/package/@budarin/psw-plugin-opfs-serve-range)           | Serves HTTP Range requests for files stored in the Origin Private File System (OPFS) — handy for offline storage and large media. |

Install and API details are in each plugin’s README on npm.

## 📄 License

MIT © Vadim Budarin
