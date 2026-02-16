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
