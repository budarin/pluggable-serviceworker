# Client: Health

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.ru.md)

Utilities to check Service Worker support and to “ping” the SW (wake it if suspended, verify fetch handler is available).

## Exports

| Name | Description |
|------|--------------|
| `isServiceWorkerSupported` | Check if Service Worker is supported in the current environment. |
| `pingServiceWorker` | Send GET request to `/sw-ping` (handled by library’s ping plugin). Wakes SW, checks fetch. |
| `PingServiceWorkerResult` | Result type: `'ok' \| 'no-sw' \| 'error'`. |
| `PingServiceWorkerOptions` | Options type for `pingServiceWorker`. |

## API

### `isServiceWorkerSupported()`

Returns whether Service Worker is available (`navigator` exists and `'serviceWorker' in navigator`). Use before calling other client utilities when code may run in SSR, tests, or old browsers.

- **Returns:** `boolean`.

### `pingServiceWorker(options?)`

Sends a `GET` request to the ping path (default `/sw-ping`). The library’s internal ping plugin in the SW responds with 204 without hitting the network. This wakes the SW if it was suspended and confirms the fetch handler is running.

- **`options`** — optional `PingServiceWorkerOptions`:
  - **`timeoutMs?: number`** — request timeout in ms (default `3000`).
  - **`path?: string`** — ping URL path (default `'/sw-ping'`; must match `pingPath` in `initServiceWorker` if you override it).
- **Returns:** `Promise<PingServiceWorkerResult>`:
  - **`'ok'`** — SW supported and response was 2xx/3xx.
  - **`'no-sw'`** — Service Worker not supported.
  - **`'error'`** — request failed or timed out.

## Usage

**Import from subpath:**

```typescript
import {
    isServiceWorkerSupported,
    pingServiceWorker,
} from '@budarin/pluggable-serviceworker/client/health';
```

**Example: guard and ping**

```typescript
if (!isServiceWorkerSupported()) {
    return;
}

const result = await pingServiceWorker();
if (result === 'ok') {
    console.log('SW is alive');
} else if (result === 'error') {
    console.warn('SW ping failed or timed out');
}
```

**Example: wake SW on focus (e.g. after device sleep)**

```typescript
import { pingServiceWorker } from '@budarin/pluggable-serviceworker/client/health';

window.addEventListener('focus', () => {
    void pingServiceWorker();
});
```

**Example: custom ping path**

```typescript
const result = await pingServiceWorker({
    path: '/internal/sw-ping',
    timeoutMs: 5000,
});
```
