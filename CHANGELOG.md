## 1.12.0

- **passthrough requests**: New mechanism to bypass the plugin chain for "internal" fetch calls made by plugins. Requests carrying the passthrough header are not passed to any plugin — the browser handles them natively (network request).
- **`PSW_PASSTHROUGH_HEADER`**: New exported constant (`'X-PSW-Passthrough'`) — the default passthrough header name. Active without any explicit configuration.
- **`ServiceWorkerInitOptions.passthroughRequestHeader?: string`**: Optional option to override the default header name.
- **`PluginContext.passthroughHeader?: string`**: New optional field — the resolved header name (populated by the library from `passthroughRequestHeader` option, defaulting to `PSW_PASSTHROUGH_HEADER`). Plugins that make internal `fetch()` calls use `context.passthroughHeader!` to add this header to their requests so they don't re-enter the plugin chain. Mock contexts in tests do not need to include this field.
- **Built-in plugins updated**: `cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `restoreAssetToCache` now add `context.passthroughHeader!` to all their internal `fetch()` calls, preventing infinite re-entry into the plugin chain.

## 1.11.0

- **Breaking**: Handler signature changed from `(event, logger)` to `(event, context)`. The second parameter is now `PluginContext` with `logger?` and `base?`. Update plugins: use `context.logger` instead of `logger`.
- **base**: Added `base?: string` to `PluginContext` and `ServiceWorkerInitOptions` for app base path. Used by asset plugins (`precache`, `restoreAssetToCache`, etc.) to resolve URLs when app is deployed under a subpath.
- **matchByUrl**: New utility `matchByUrl(cache, request)` — cache match by URL only (ignores request mode). Fixes "Failed to fetch" for script requests. Built-in plugins updated to use it.
- **resolveAssetUrls**: New utility for resolving asset paths with base. Skip `normalizeUrl` for `http://` and `https://` URLs when base is `'/'` or unset.
- **Utils**: Exported `isRequestUrlInAssets(requestUrl, assets)`. Added to README, README.ru, reference.mdc.
- **restoreAssetToCache**: Memoize resolved asset URLs per `context.base`; avoid recomputing on every fetch.
- **initServiceWorker**: Single `allPlugins` array instead of creating it twice.
- **createEventHandlers**: Extracted `runParallelHandlers` helper for install, activate, sync, periodicsync, backgroundfetch* handlers.
- **fetch**: Passthrough depth tracking to prevent recursion when fallback `fetch()` triggers the SW's own fetch handler.

## 1.10.9

- **pingServiceWorker**: Timer is always cleared in `finally`, so it no longer stays active after timeout or fetch error.
- Push: notifications from returned payloads are now shown in parallel (`Promise.all`).
- **restoreAssetToCache**: Normalized asset URLs are precomputed once at plugin creation; fetch handler uses a single normalization per request.
- **precacheMissing**: Each asset URL is normalized once when computing the missing list (via Map).

## 1.10.8

- Docs: README and README.ru — tone and structure aligned with project doc rules; sections rewritten to start with short "what / when" intros and to avoid duplicated explanations.
- Docs: added `@budarin/psw-plugin-opfs-serve-range` to the "Plugins (ready-made)" / "Плагины" tables in both READMEs.
- Docs: `docs/article-habr.md` and `.cursor/rules/docs.mdc` updated so future documentation changes follow the same neutral, user-focused style.
- **notifyClients**: Added third argument `includeUncontrolled = false`. By default sends messages only to window clients controlled by this SW; when `includeUncontrolled = true`, also sends to uncontrolled window clients in scope. Backward compatible; docs updated in README, README.ru, reference.mdc.

## 1.10.5

- Docs: README and README.ru — added Table of contents / Содержание at the top; new section “Plugins (ready-made)” / “Плагины” at the end with links to `@budarin/psw-plugin-serve-root-from-asset` and `@budarin/psw-plugin-serve-range-requests`.

## 1.10.4

- **notifyClients**: Optional second argument `data?: Record<string, unknown>`. With one argument, sends `{ type: messageType }` as before; with two, sends `{ type: messageType, ...data }` to all window clients. Payload object is not mutated. Backward compatible. Docs: README, README.ru, reference.mdc.

## 1.10.3

- Docs: README, README.ru — in "How the package works" section, added that `null` and `undefined` entries in the plugins array are ignored (no need to filter manually).

## 1.10.2

- **Background Fetch**: At service worker init, support is checked (`'backgroundFetch' in self.registration`). Handlers for `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick` are registered only when the API is supported. If plugins registered BF handlers but the browser does not support Background Fetch, a warning is logged. Documentation (README, README.ru) updated accordingly.

## 1.10.1

- Plugins array: `null` and `undefined` entries are ignored (e.g. when a factory returns `undefined` when an API is unavailable). No need to filter manually.

## 1.10.0

- Plugins array: `null` and `undefined` entries are ignored (e.g. when a factory returns `undefined` when an API is unavailable). No need to filter manually.
- **Breaking**: `ServiceWorkerErrorType` enum replaced with `serviceWorkerErrorTypes` const object and `ServiceWorkerErrorType` type. Import the value as `serviceWorkerErrorTypes` (e.g. `serviceWorkerErrorTypes.INSTALL_ERROR`); use type `ServiceWorkerErrorType` for annotations. Aligns with project rule: no enums, use const object + type (see .cursor/rules/types.mdc).
- **Internal**: Added `src/constants/versionMessages.ts` and `src/constants/paths.ts` (previously missing modules).
- **Rules**: types.mdc — "No enums, use const object + type"; main.mdc — strengthened role as equal co-author and critical review before changes.
- Docs: README, README.ru, tests updated to use `serviceWorkerErrorTypes`.

## 1.9.0

- **Background Fetch API**: Service worker now supports Background Fetch events. Plugins can implement `backgroundfetchsuccess`, `backgroundfetchfail`, `backgroundfetchabort`, `backgroundfetchclick` handlers. New error types: `BACKGROUNDFETCHSUCCESS_ERROR`, `BACKGROUNDFETCHFAIL_ERROR`, `BACKGROUNDFETCHABORT_ERROR`, `BACKGROUNDFETCHCLICK_ERROR`.
- **Client — Background Fetch**: New client utilities (import from `@budarin/pluggable-serviceworker/client` or `.../client/background-fetch`): `isBackgroundFetchSupported()`, `startBackgroundFetch()`, `getBackgroundFetchRegistration()`, `abortBackgroundFetch()`, `getBackgroundFetchIds()`.
- **Client — structure**: Client utilities are grouped into subfolders. New package exports: `./client/registration`, `./client/messaging`, `./client/health`, `./client/background-fetch`. Import from these subpaths to reduce bundle size. The main `./client` entry still re-exports everything for backward compatibility.
- **Event handlers only when needed**: Event listeners (`install`, `activate`, `fetch`, `message`, `sync`, `periodicsync`, `push`, background fetch events) are now registered only when at least one plugin provides a handler for that event. No empty listeners. Return type of `createEventHandlers` is now `CreateEventHandlersResult` with optional event handler properties.
- Documentation updated (README.md, README.ru.md): Background Fetch, client subpaths, new error types, conditional handler registration. Client utilities: detailed README per folder (registration, messaging, health, backgroundFetch) with API and examples, linked from main README via GitHub URLs.

## 1.8.0

- **Breaking change**: Removed deprecated `ServiceWorkerConfig` type alias (use `ServiceWorkerInitOptions` instead).
- **Breaking change**: Removed deprecated `precacheAndNotify` function and `PrecacheAndNotifyConfig` type (use `precacheWithNotification` and `PrecacheWithNotificationConfig` instead).
- Added `order?: number` parameter to all plugin config interfaces. Plugins without config now accept optional `config?: { order?: number }` parameter.
- Plugins now extract `order` from config with default value `0`, making execution order visible directly in plugin initialization code.
- Updated documentation (README.md, README.ru.md, docs/article-habr.md) with examples showing `order` usage in plugin configs.
- Added recommendations about when to use explicit `order` vs relying on array order (most cases don't need explicit `order`).

## 1.7.2

- Docs: bump README and README.ru examples to use version `1.7.2` so snippets match the published package version.
- Docs: verified status badges (CI, npm, bundle size, license) in the English README still point to the correct repository and package.

## 1.7.1

- `precacheAndNotify` has been renamed to `precacheWithNotification` for clearer semantics (notifications at the start and end of precache); the old factory and config type remain as deprecated aliases for backwards compatibility.
- `onServiceWorkerMessage` now returns an unsubscribe function so you can remove the listener when it is no longer needed.
- `onNewServiceWorkerVersion` now also returns an unsubscribe function so you can stop listening for updates when no longer needed.
- Documentation updated (README, README.ru.md, Habr article) to mention the new name and show the unsubscribe patterns.

## 1.6.6

- Docs: note that all built-in plugins from the package have no `order` and run in the “no order” group (added to README, README.ru.md, and the Habr article).

## 1.6.3

- Docs: link to Russian README in the English README now uses an absolute repo URL so it works when viewing the package on npm (relative link returned 404). Minor wording improvements.

## 1.6.1

- Docs: main README translated to English; Russian version moved to `README.ru.md`. English README now links to the Russian document.

## 1.6.0

- Required `version` option added to `ServiceWorkerInitOptions` and to the ready-made SW presets.
- Internal version plugin: the SW responds to version requests (use `getServiceWorkerVersion()` on the client).
- Internal ping plugin (`GET /sw-ping`) and client utility `pingServiceWorker()` to “wake” the SW (especially useful on mobile after the device was idle).
- New client API:
    - `onNewServiceWorkerVersion` — detect when a new SW version is available;
    - `onServiceWorkerMessage` — subscribe to messages from the SW;
    - `isServiceWorkerSupported` — check if Service Worker is supported;
    - `postMessageToServiceWorker` — send messages to the SW with a soft fallback;
    - `getServiceWorkerVersion` — request the SW version;
    - `pingServiceWorker` — ping the SW via `GET /sw-ping`.

> Note: versions before 1.6.0 are not listed here because the package was in a fast iteration phase and the API could change without being documented.
