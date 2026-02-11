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
