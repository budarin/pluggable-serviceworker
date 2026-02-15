# Client: Registration

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.ru.md)

Utilities for registering the Service Worker and subscribing to new-version updates.

## Exports

| Name | Description |
|------|--------------|
| `registerServiceWorkerWithClaimWorkaround` | Register SW and optionally reload once when using `claim()` (browser workaround). |
| `onNewServiceWorkerVersion` | Subscribe to new SW version (installed, with active controller). Returns unsubscribe. |

## API

### `registerServiceWorkerWithClaimWorkaround(scriptURL, options?)`

Registers the Service Worker. After `navigator.serviceWorker.ready`, if the page is not yet controlled (`navigator.serviceWorker.controller === null`), performs a one-time reload. Use with any SW; especially important when the SW calls `clients.claim()` in `activate` — works around [browser bug](https://issues.chromium.org/issues/482903583).

- **`scriptURL`** — path to the SW script (e.g. `'/sw.js'`).
- **`options`** — optional standard [RegistrationOptions](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#options) (`scope`, `type`).
- **Returns:** `Promise<ServiceWorkerRegistration | undefined>`. `undefined` if Service Worker is not supported.

### `onNewServiceWorkerVersion(registration, onUpdate)` / `onNewServiceWorkerVersion(onUpdate)`

Subscribes to the appearance of a new Service Worker version. The callback runs when the browser has installed a new SW (state `installed`) and the page already has an active controller — i.e. an **update**, not the first install.

**Overloads:**

1. `onNewServiceWorkerVersion(registration, onUpdate)` — use after you have a registration (e.g. from `registerServiceWorkerWithClaimWorkaround`).
2. `onNewServiceWorkerVersion(onUpdate)` — use when SW is already registered; waits for `navigator.serviceWorker.ready` and then attaches the listener.

- **`registration`** — `ServiceWorkerRegistration | undefined` (first overload only).
- **`onUpdate`** — `(registration: ServiceWorkerRegistration) => void`.
- **Returns:** `() => void` — call to unsubscribe.

## Usage

**Import from subpath (smaller bundle):**

```typescript
import {
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/registration';
```

**Or from main client entry:**

```typescript
import {
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client';
```

**Example: register and show “New version available” banner**

```typescript
if ('serviceWorker' in navigator) {
    const reg = await registerServiceWorkerWithClaimWorkaround('/sw.js');

    const unsubscribe = onNewServiceWorkerVersion(reg, () => {
        // Show "New version available" banner
        showUpdateBanner();
    });

    // Later: unsubscribe();
}
```

**Example: subscribe without explicit registration**

```typescript
onNewServiceWorkerVersion((reg) => {
    console.log('New SW version installed', reg);
});
```
