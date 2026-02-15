# Client: Messaging

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.ru.md)

Utilities for sending messages to the Service Worker and subscribing to messages **by type**. Includes version query that works with the library’s internal plugin (no SW setup required).

---

## Exports

| Name | Description |
|------|--------------|
| `onServiceWorkerMessage` | Subscribe to messages from SW with a given `data.type`. Returns unsubscribe. |
| `postMessageToServiceWorker` | Send a message to the active Service Worker. |
| `getServiceWorkerVersion` | Request the active SW version (from `initServiceWorker` options). |
| `PostMessageToServiceWorkerOptions` | Options type for `postMessageToServiceWorker`. |
| `GetServiceWorkerVersionOptions` | Options type for `getServiceWorkerVersion`. |

---

## Message format

The library expects messages to be **objects with a `type` field** (string). The SW sends e.g. `{ type: 'MY_TYPE', ...payload }`. Your client handler receives a standard `MessageEvent`; `event.data` is that object. `onServiceWorkerMessage(messageType, handler)` only invokes `handler` when `event.data.type === messageType`, so you can have multiple subscribers for different types.

---

## 1. `onServiceWorkerMessage(messageType, handler)`

Subscribes to messages from the Service Worker where `event.data.type === messageType`. All other messages are ignored. Use for “new version ready” banners, cache-update notifications, or any custom SW→client protocol.

**Parameters:**

| Parameter | Type | Description |
|------------|------|-------------|
| `messageType` | `string` | Exact type to listen for (e.g. `'SW_MSG_NEW_VERSION_READY'`). |
| `handler` | `(event: MessageEvent) => void` | Called when a message with this type is received. |

- **Returns:** `() => void` — call to unsubscribe (removes the listener). If Service Worker is not supported, returns a no-op function.

**Behaviour:**

- Listener is added on `navigator.serviceWorker` (all SW messages).
- Only messages whose `event.data` is an object with `data.type === messageType` trigger the handler.
- You can call `onServiceWorkerMessage` multiple times for different types; each subscription is independent.

**Example — subscribe and read payload:**

```typescript
import { onServiceWorkerMessage } from '@budarin/pluggable-serviceworker/client/messaging';

const unsubscribe = onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', (event) => {
    const data = event.data as { type: string; version?: string };
    console.log('New version ready', data.version);
    showReloadBanner();
});

// When the component unmounts or you no longer need it:
unsubscribe();
```

**Example — several message types:**

```typescript
const unsub1 = onServiceWorkerMessage('CACHE_UPDATED', (event) => {
    const data = event.data as { type: string; urls?: string[] };
    console.log('Cache updated', data.urls);
});

const unsub2 = onServiceWorkerMessage('SYNC_FAILED', (event) => {
    const data = event.data as { type: string; reason?: string };
    reportError(data.reason);
});

// Cleanup:
unsub1();
unsub2();
```

---

## 2. `postMessageToServiceWorker(message, options?)`

Sends a **serializable** message to the active Service Worker (either `navigator.serviceWorker.controller` or `registration.active` if controller is not set yet but registration is ready).

**Parameters:**

| Parameter | Type | Description |
|------------|------|-------------|
| `message` | `unknown` | Any [structured-cloneable](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) value (e.g. `{ type: 'PING', id: 1 }`). |
| `options` | `PostMessageToServiceWorkerOptions` (optional) | See below. |

**`PostMessageToServiceWorkerOptions`:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `waitForReady` | `boolean` | `true` | If there is no `controller` yet: when `true`, waits for `navigator.serviceWorker.ready` and sends via `registration.active` if present; when `false`, returns `false` immediately. |

- **Returns:** `Promise<boolean>` — `true` if the message was sent (controller or active worker found), `false` if Service Worker is not supported or no active worker (and, when `waitForReady === false`, when there is no controller yet).

**Example — send and check:**

```typescript
import { postMessageToServiceWorker } from '@budarin/pluggable-serviceworker/client/messaging';

const payload = { type: 'MY_MSG_PING', timestamp: Date.now() };
const sent = await postMessageToServiceWorker(payload);
if (!sent) {
    console.warn('Service Worker not ready or not supported');
}
```

**Example — do not wait for ready (fail fast if no controller):**

```typescript
const sent = await postMessageToServiceWorker(
    { type: 'PING' },
    { waitForReady: false }
);
if (!sent) {
    console.log('No controller yet, skip or retry later');
}
```

**Example — custom protocol (SW must handle the type in its `message` plugin):**

```typescript
await postMessageToServiceWorker({
    type: 'FETCH_PREVIEW',
    url: '/api/preview',
    id: 'preview-1',
});
```

---

## 3. `getServiceWorkerVersion(options?)`

Requests the **version string** from the active Service Worker (the `version` passed to `initServiceWorker`). Uses the library’s internal protocol: sends `{ type: PLUGGABLE_SW_GET_VERSION }` and waits for `{ type: PLUGGABLE_SW_VERSION, version: string }`. No extra SW code needed.

**Parameters:**

| Parameter | Type | Description |
|------------|------|-------------|
| `options` | `GetServiceWorkerVersionOptions` (optional) | See below. |

**`GetServiceWorkerVersionOptions`:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `timeoutMs` | `number` | `5000` | Max time to wait for the version response, in ms. |

- **Returns:** `Promise<string | null>` — the version string, or `null` if:
  - Service Worker is not supported, or
  - No active worker (message not sent), or
  - No response within `timeoutMs`.

**Example — show version in UI:**

```typescript
import { getServiceWorkerVersion } from '@budarin/pluggable-serviceworker/client/messaging';

const version = await getServiceWorkerVersion({ timeoutMs: 3000 });
if (version != null) {
    document.getElementById('sw-version').textContent = version;
} else {
    console.warn('Could not get SW version (unsupported, no worker, or timeout)');
}
```

**Example — default timeout (5s):**

```typescript
const version = await getServiceWorkerVersion();
console.log('SW version:', version ?? 'unknown');
```

---

## Full flow example (all methods)

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/messaging';

// 1) Subscribe to SW messages by type
const unsubscribe = onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', (event) => {
    const data = event.data as { type: string; version?: string };
    showBanner('New version ' + (data.version ?? '') + ' — please reload');
});

// 2) Send a custom message to the SW
const sent = await postMessageToServiceWorker({ type: 'PING', id: 1 });
if (!sent) console.warn('Message not sent');

// 3) Get SW version (library protocol)
const version = await getServiceWorkerVersion({ timeoutMs: 5000 });
console.log('Service Worker version:', version ?? 'n/a');

// 4) Cleanup when done
unsubscribe();
```

---

## Import

**Subpath (smaller bundle):**

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/messaging';
```

**Main client entry:**

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client';
```
