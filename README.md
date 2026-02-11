# @budarin/pluggable-serviceworker

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/README.ru.md)

A library for building modular, pluggable Service Workers.

> Production-oriented: typed API, predictable plugin execution order, centralized error handling, built-in version/ping mechanisms, and ready-made activation scenarios let you use it safely in real-world frontend projects.

## 🚀 Why this package?

Building Service Workers (SW) is traditionally hard: manual event handlers, error handling, execution order, or learning large frameworks. This package addresses that:

### 🔌 **Modular architecture**

- **Plugin system** — split behaviour into independent modules
- Each plugin handles one concern (caching, auth, notifications)
- Add or remove behaviour without touching core SW code
- No need to think about event wiring — write simple handlers and let the library run them

### 🎯 **Predictable execution order**

- Execution order: plugins with negative `order` (ascending), then without `order` (registration order), then with non‑negative `order` (ascending)
- Control initialization order explicitly
- **Parallel** for `install`, `activate`, `message`, `sync`, `periodicsync`
- **Sequential** for `fetch` (first non-undefined response wins); for `push` all handlers run
- Easy to slot new plugins where you need them

### 📖 **Easy to learn**

- Single contract: a plugin with optional hooks, no separate routing/strategy model
- Few concepts: plugin, plugin factory, `initServiceWorker`, options
- Low cognitive load: plugin order and return values define behaviour
- Quick onboarding via examples and the `ServiceWorkerPlugin` type

### 📦 **Small footprint**

- Minimal dependencies, plugin runtime only
- No built-in build step or heavy modules — only what you import is bundled
- Fits projects where bundle size and dependency count matter

### 🎛 **Full control**

- You define cached assets and strategies (in code or config)
- Plugin order, error handling, and logger are under your control
- Custom logic in `fetch`, `push`, `sync` via your own plugins, no framework workarounds

### 🛡️ **Centralized error handling**

- **Single** `onError` for all error types in the service worker, with error location
- **Typed errors** — you know what failed
- **Isolation** — a failing plugin does not break others
- **Automatic** handling of global error events

### 📝 **Logging**

- **Configurable logger** with levels (`trace`, `debug`, `info`, `warn`, `error`)
- The same `logger` is passed into every plugin handler
- You can supply any object that implements the logger interface

### ✅ **Ready-made building blocks**

- Plugins: precache, cacheFirst, networkFirst, staleWhileRevalidate, skipWaiting, claim, and more
- **offlineFirst** preset — precache on install, serve from cache on fetch
- Ready-made SW entry points: **activateOnSignal**, **activateImmediately**, **activateOnNextVisit**
- Client utilities: registration with claim() workaround, new-version detection, message subscription, version query, ping to wake SW, support check

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

```typescript
// precacheAndServePlugin.js
import type { Plugin } from '@budarin/pluggable-serviceworker';

export function precacheAndServePlugin(config: {
    cacheName: string;
    assets: string[];
}): Plugin {
    const { cacheName, assets } = config;

    return {
        name: 'precache-and-serve',

        install: async (_event, logger) => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
        },

        fetch: async (event, logger) => {
            const cache = await caches.open(cacheName);
            const asset = await cache.match(event.request);

            if (!asset) {
                logger.debug(
                    `precache-and-serve: asset ${event.request.url} not found in cache!`
                );
            }

            return asset ?? undefined;
        },
    };
}
```

```typescript
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
    {
        version: '1.6.0',
    }
);
```

## Demo

The [demo/](demo/) folder contains a **React + Vite** app with the **offlineFirst** preset and **activateOnSignal** SW. From repo root: `pnpm start`. See [demo/README.md](demo/README.md).

## initServiceWorker(plugins, options)

`initServiceWorker` is the entry point: it registers Service Worker event handlers (`install`, `activate`, `fetch`, …) and runs them through the plugin list.

- **`plugins`** — array of plugin objects. Plugins with config come from **factory** calls at the call site (see “Plugin factory”).
- **`options`** — at least `version` (required), and optional `pingPath?`, `logger?`, `onError?`. The **logger** (from options or `console`) is passed as the second argument to plugin handlers.

**Example:**

```typescript
initServiceWorker(
    [
        precache({ cacheName: 'v1', assets: ['/'] }),
        serveFromCache({ cacheName: 'v1' }),
    ],
    {
        version: '1.6.0',
        logger: customLogger,
        onError: handleError,
    }
);
```

## ⚙️ initServiceWorker options (version, pingPath, logger, onError)

The second parameter `options` is of type `ServiceWorkerInitOptions`: required `version` and optional `pingPath?`, `logger?`, `onError?`. Only **logger** is passed into plugin handlers (second argument); if omitted, `console` is used. `onError` is used only by the library, not passed to plugins.

`PluginContext` in the API is for typing (it has `logger?`); plugins do not receive a richer context.

```typescript
interface PluginContext {
    logger?: Logger; // default: console
}

interface ServiceWorkerInitOptions extends PluginContext {
    /** Service worker / app version string (e.g. '1.6.0'). */
    version: string;

    /** Optional path for ping requests (default '/sw-ping'). */
    pingPath?: string;

    onError?: (error, event, errorType?) => void; // library only, not passed to plugins
}
```

### Option fields

#### `version: string` (required)

Version string for the service worker / app. Used by:

- the library’s internal plugin that answers version requests (`getServiceWorkerVersion()` on the client);
- logging and debugging (you can log it in your `onError` or logger).

Recommend using the same string as your frontend app version (e.g. from `package.json`).

**Example:**

```typescript
initServiceWorker(plugins, {
    version: '1.6.0',
});
```

#### `pingPath?: string` (optional)

Overrides the ping path handled by the library’s internal ping plugin. Default is `'/sw-ping'` (constant `SW_PING_PATH`). This must match what you use on the client in `pingServiceWorker({ path: ... })` if you change it.

**Examples:**

```typescript
// Default — internal plugin handles GET /sw-ping
initServiceWorker(plugins, {
    version: '1.6.0',
});

// Custom ping path (e.g. to avoid clashing with backend)
initServiceWorker(plugins, {
    version: '1.6.0',
    pingPath: '/internal/sw-ping',
});
```

#### `logger?: Logger` (optional)

Logger object with `info`, `warn`, `error`, `debug`. Default is `console`. Any object implementing the `Logger` interface is accepted.

```typescript
interface Logger {
    trace: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
}
```

**Example:**

```typescript
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
- `errorType?: ServiceWorkerErrorType` — error type (see “Error handling”)

**Important:** If `onError` is not set, plugin and global errors are not handled. For production, always set `onError` for logging and monitoring.

**Examples:**

```typescript
// Minimal: version only
initServiceWorker([cachePlugin], {
    version: '1.6.0',
});

// With onError
initServiceWorker([cachePlugin], {
    version: '1.6.0',
    onError: (error, event, errorType) => {
        console.error('Service Worker error:', error, errorType);
    },
});
```

### Error handling

The library lets you define one handler for all error types and handle each type as needed. It subscribes to global `error`, `messageerror`, `unhandledrejection`, `rejectionhandled`; an error in one plugin does not stop others. If `onError` throws, the exception is logged via `options.logger`.

```typescript
import {
    initServiceWorker,
    ServiceWorkerErrorType,
} from '@budarin/pluggable-serviceworker';

const logger = console; // or your own logger

const options = {
    version: '1.6.0',
    logger,
    onError: (error, event, errorType) => {
        logger.info(`Error type "${errorType}":`, error);

        switch (errorType) {
            case ServiceWorkerErrorType.INSTALL_ERROR:
            case ServiceWorkerErrorType.ACTIVATE_ERROR:
            case ServiceWorkerErrorType.FETCH_ERROR:
            case ServiceWorkerErrorType.MESSAGE_ERROR:
            case ServiceWorkerErrorType.SYNC_ERROR:
            case ServiceWorkerErrorType.PERIODICSYNC_ERROR:
            case ServiceWorkerErrorType.PUSH_ERROR:
                logger.error(`Plugin error (${errorType}):`, error);
                if (error instanceof Error && error.stack) {
                    logger.error('Plugin error Stack:', error.stack);
                }
                break;

            case ServiceWorkerErrorType.ERROR:
                logger.error('JavaScript error:', error);
                break;

            case ServiceWorkerErrorType.MESSAGE_ERROR_HANDLER:
                logger.error('Message error:', error);
                break;

            case ServiceWorkerErrorType.UNHANDLED_REJECTION:
                logger.error('Unhandled promise rejection:', error);
                break;

            case ServiceWorkerErrorType.REJECTION_HANDLED:
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

A plugin implements `ServiceWorkerPlugin`. Plugin-specific config is set when calling the **factory**. The `_C` type parameter (e.g. `PluginContext`) is for typing; the default context only has `logger`.

```typescript
interface ServiceWorkerPlugin<_C extends PluginContext = PluginContext> {
    name: string;

    order?: number;

    install?: (event: ExtendableEvent, logger: Logger) => Promise<void> | void;

    activate?: (event: ExtendableEvent, logger: Logger) => Promise<void> | void;

    fetch?: (
        event: FetchEvent,
        logger: Logger
    ) => Promise<Response | undefined> | Response | undefined;

    message?: (event: SwMessageEvent, logger: Logger) => void;

    sync?: (event: SyncEvent, logger: Logger) => Promise<void> | void;

    push?: (
        event: PushEvent,
        logger: Logger
    ) =>
        | Promise<PushNotificationPayload | void>
        | PushNotificationPayload
        | void;

    periodicsync?: (
        event: PeriodicSyncEvent,
        logger: Logger
    ) => Promise<void> | void;
}
```

### 📝 Method summary

| Method         | Event          | Returns                                         | Description                       |
| -------------- | -------------- | ----------------------------------------------- | --------------------------------- |
| `install`      | `install`      | `void`                                          | Plugin init on SW install         |
| `activate`     | `activate`     | `void`                                          | Plugin activation on SW update    |
| `fetch`        | `fetch`        | `Response \| undefined`                         | Handle network requests           |
| `message`      | `message`      | `void`                                          | Handle messages from main thread  |
| `sync`         | `sync`         | `void`                                          | Background sync                   |
| `push`         | `push`         | `PushNotificationPayload \| false \| undefined` | Handle and show push notification |
| `periodicsync` | `periodicsync` | `void`                                          | Periodic background tasks         |

How the package works:

- Arrays are created for each event type: install, activate, fetch, message, sync, periodicsync, push
- Plugins are sorted: those with `order` &lt; 0 (ascending), then without `order` (registration order), then with `order` ≥ 0 (ascending)
- In that order, each plugin’s handlers are pushed into the corresponding arrays
- When an event fires in the service worker, handlers from the matching array are run

### 🎯 Handler behaviour

- Every method receives `event` as the first argument and **logger** as the second.
- **`fetch`**: return `Response` to end the chain or `undefined` to pass to the next plugin. If all return `undefined`, the framework calls `fetch(event.request)`.
- **`push`**: may return `PushNotificationPayload` (for [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)), `false` (do not show), or `undefined` (library decides). All `push` handlers run. For each `PushNotificationPayload` result, `showNotification` is called. No notification if all return `false` or only `undefined`/`false` without payload. The library shows one notification **only when all** plugins return `undefined` (and there is payload to show).
- **Other handlers** (`install`, `activate`, `message`, `sync`, `periodicsync`): return value is ignored; the framework calls each plugin’s method in order; the chain does not short-circuit.
- **All handlers are optional** — implement only the events you need.

## 🎯 Plugin execution order

Plugins run in this order:

1. **Plugins with negative `order`** — sorted ascending (e.g. -10 → -1)
2. **Plugins without `order`** — in the order they were added
3. **Plugins with `order` ≥ 0** — sorted ascending (e.g. 0 → 5)

Built-in plugins (precache, claim, serveFromCache, etc.) do not set `order` and run in the “no order” group—in the order you list them in the array.

### Example:

```typescript
const plugins = [
    { name: 'fifth', order: 4 },
    { name: 'second' }, // no order
    { name: 'first', order: -1 }, // negative — runs first
    { name: 'fourth', order: 3 },
    { name: 'third', order: 0 },
];

// Execution order: first (order -1) → second (no order) → third (0) → fourth (3) → fifth (4)
```

**Benefits:**

- 🎯 **Predictable** — negative → no order → non‑negative, each group sorted where applicable
- 🔧 **Simple** — use negative for “early”, positive for “late”, omit for “middle”
- 📈 **Scalable** — easy to slot plugins without renumbering

## ⚡ Handler execution behaviour

Different Service Worker events are handled differently:

### 🔄 Parallel execution

**Events:** `install`, `activate`, `message`, `sync`, `periodicsync`

All handlers run **in parallel** via `Promise.all()`:

```typescript
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
        precache({ cacheName: 'app-v1', assets: ['/', '/main.js'] }),
        precacheMissing({ cacheName: 'ext-v1', assets: ['/worker.js'] }),
        skipWaiting,
    ],
    {
        version: '1.6.0',
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

```typescript
import type { Plugin } from '@budarin/pluggable-serviceworker';

function authPlugin(config: { protectedPaths: string[] }): Plugin {
    const { protectedPaths } = config;

    return {
        name: 'auth',

        fetch: async (event, logger) => {
            const path = new URL(event.request.url).pathname;

            if (protectedPaths.some((p) => path.startsWith(p))) {
                if (needsAuth(event.request)) {
                    logger.warn('auth: unauthorized', event.request.url);

                    return new Response('Unauthorized', { status: 401 }); // Stops chain
                }
            }
            return undefined; // Pass to next plugin
        },
    };
}

// Usage: authPlugin({ protectedPaths: ['/api/'] })
```

**Why sequential:**

- **fetch**: Only one response per request; first non-undefined stops the chain. If none returns a response, `fetch(event.request)` is used
- **push**: Plugin can return `PushNotificationPayload`, `false`, or `undefined`. The library calls `showNotification` for each payload. It shows one notification when **all** plugins return `undefined`

### 📋 Summary table

| Event          | Execution  | Short-circuit | Reason                        |
| -------------- | ---------- | ------------- | ----------------------------- |
| `install`      | Parallel   | No            | Independent init              |
| `activate`     | Parallel   | No            | Independent activation        |
| `fetch`        | Sequential | Yes           | Single response               |
| `message`      | Parallel   | No            | Independent handlers          |
| `sync`         | Parallel   | No            | Independent tasks             |
| `periodicsync` | Parallel   | No            | Independent periodic          |
| `push`         | Sequential | No            | Show all needed notifications |

## Primitives, presets, and ready-made service workers

### Primitives (plugins)

One primitive = one operation. Import from `@budarin/pluggable-serviceworker/plugins`.
Primitives with config are **plugin factories** (see “Plugin factory”): config is passed at the call site; `initServiceWorker` options are only `version` (required), `pingPath?`, `logger?`, `onError?`. Primitives without config (`skipWaiting`, `claim`, …) are ready-made plugin objects.

| Name                              | Event      | Description                                                                                                                                                                  |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim`                           | `activate` | Calls `clients.claim()`.                                                                                                                                                     |
| `claimAndReloadClients`           | `activate` | **claim** + **reloadClients** in one plugin (order guaranteed).                                                                                                              |
| `pruneStaleCache(config)`         | `activate` | Removes cache entries whose URL is not in `config.assets`.                                                                                                                   |
| `cacheFirst(config)`              | `fetch`    | Serve from cache `config.cacheName`; on miss, fetch and cache.                                                                                                               |
| `networkFirst(config)`            | `fetch`    | Fetch from network, on success cache. On error serve from cache. Otherwise undefined.                                                                                        |
| `restoreAssetToCache(config)`     | `fetch`    | For URLs in `config.assets`: serve from cache or fetch and put in cache. Otherwise undefined.                                                                                |
| `serveFromCache(config)`          | `fetch`    | Serves from cache `config.cacheName`; if missing, returns undefined.                                                                                                         |
| `staleWhileRevalidate(config)`    | `fetch`    | Serve from cache, revalidate in background.                                                                                                                                  |
| `precache(config)`                | `install`  | Caches `config.assets` in cache `config.cacheName`.                                                                                                                          |
| `precacheWithNotification(config)` | `install` | Same as **precache**, plus sends `startInstallingMessage` (default `SW_MSG_START_INSTALLING`) to clients, then caches, then `installedMessage` (default `SW_MSG_INSTALLED`). |
| `precacheMissing(config)`         | `install`  | Adds to cache only assets from `config.assets` that are not yet cached.                                                                                                      |
| `skipWaiting`                     | `install`  | Calls `skipWaiting()`.                                                                                                                                                       |
| `skipWaitingOnMessage(config?)`   | `message`  | Triggers on message with `messageType` (default `SW_MSG_SKIP_WAITING`).                                                                                                      |

#### Composing primitives

Handlers of the same type from different plugins run **in parallel**. For strict order (e.g. claim then reload clients), use one plugin that calls the primitives in sequence:

```typescript
import { claim } from '@budarin/pluggable-serviceworker/plugins';
import { reloadClients } from '@budarin/pluggable-serviceworker/plugins';

const claimPlugin = claim();
const reloadPlugin = reloadClients();

activate: async (event, logger) => {
    await claimPlugin.activate?.(event, logger);
    await reloadPlugin.activate?.(event, logger);
},
```

**Example: custom cache and URL logic**

Factory `postsSwrPlugin(config)` returns a plugin that applies `stale-while-revalidate` only to requests matching `pathPattern`:

```typescript
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

        fetch: async (event, logger) => {
            if (!pathPattern.test(new URL(event.request.url).pathname)) {
                return undefined;
            }
            return swrPlugin.fetch!(event, logger);
        },
    };
}
```

```typescript
// sw.ts
const staticCache = 'static-v1';
const assets = ['/', '/main.js'];

initServiceWorker(
    [
        precache({ cacheName: staticCache, assets }),
        serveFromCache({ cacheName: staticCache }),
        postsSwrPlugin({ cacheName: 'posts' }),
    ],
    {
        version: '1.6.0',
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

```typescript
// sw.js — your service worker entry
import { activateAndUpdateOnNextVisitSW } from '@budarin/pluggable-serviceworker/sw';

activateAndUpdateOnNextVisitSW({
    version: '1.6.0',
    cacheName: 'my-cache-v1',
    assets: ['/', '/styles.css', '/script.js'],
    onError: (err, event, type) => console.error(type, err),
});
```

### Published utilities

| Name                                                            | Use in | Description                                                                                                                                                   |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerServiceWorkerWithClaimWorkaround(scriptURL, options?)` | client | Register SW when activate calls claim(); optional one-time reload on first load (workaround for [browser bug](https://issues.chromium.org/issues/482903583)). |
| `onNewServiceWorkerVersion(regOrHandler, onUpdate?)`            | client | Subscribe to new SW version. Callback when new version is installed and there is an active controller (update, not first install).                            |
| `onServiceWorkerMessage(messageType, handler)`                  | client | Subscribe to messages from SW with given `data.type`. Returns an unsubscribe function. E.g. “new version available” banners.                                 |
| `isServiceWorkerSupported()`                                    | client | Check if Service Worker is supported. Useful for SSR/tests/old browsers.                                                                                      |
| `postMessageToServiceWorker(message, options?)`                 | client | Send message to active Service Worker. Returns `Promise<boolean>`.                                                                                            |
| `getServiceWorkerVersion(options?)`                             | client | Get active SW version (`version` from `ServiceWorkerInitOptions`). Returns `Promise<string \| null>`.                                                         |
| `pingServiceWorker(options?)`                                   | client | GET /sw-ping (handled by ping plugin). Wakes SW if sleeping, checks fetch availability. Returns `'ok' \| 'no-sw' \| 'error'`.                                 |
| `normalizeUrl(url)`                                             | SW     | Normalize URL (relative → absolute by SW origin) for comparison.                                                                                              |
| `notifyClients(messageType)`                                    | SW     | Send `{ type: messageType }` to all client windows.                                                                                                           |

<br />

Use `registerServiceWorkerWithClaimWorkaround` on the page so the SW takes control on first load when using `claim()` (workaround for [browser bug](https://issues.chromium.org/issues/482903583)). Without it, the page may have no controller until reload.

<br />

```typescript
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

    onNewServiceWorkerVersion(reg, () => {
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

    // later, when you no longer need the message subscription:
    unsubscribeMsg();
}
```

### 📱 Recipe: mobile sleep and waking the SW

On mobile, the SW process can be suspended. After a long idle, the first interaction (e.g. messages) may fail until the worker wakes. To reduce issues:

- Call `pingServiceWorker()` on `focus` / `visibilitychange`:

```typescript
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

In your package’s `package.json`:

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

`peerDependencies` so the plugin works with the user’s library version; `devDependencies` for build and types.

**2. Importing types in the plugin**

Import type **`Plugin`** (alias for `ServiceWorkerPlugin<PluginContext>`); and if needed `Logger`, `SwMessageEvent`, `PushNotificationPayload`, etc.

```typescript
import type { Plugin } from '@budarin/pluggable-serviceworker';

export interface MyPluginConfig {
    cacheName: string;
}

export function myPlugin(config: MyPluginConfig): Plugin {
    const { cacheName } = config;

    return {
        name: 'my-plugin',

        install: async (_event, logger) => {
            logger.info('my-plugin: install');
            const cache = await caches.open(cacheName);
            await cache.add('/offline.html');
        },

        fetch: async (event, _logger) => {
            const cached = await caches.match(event.request);
            return cached ?? undefined;
        },
    };
}
```

Users add the plugin like: `initServiceWorker([..., myPlugin({ cacheName: 'my-v1' })], options)`.

## 📄 License

MIT © Vadim Budarin
