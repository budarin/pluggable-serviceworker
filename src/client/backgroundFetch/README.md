# Client: Background Fetch

[Русская версия (Russian)](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.ru.md)

Utilities for the [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API): start, monitor, and abort background downloads. Requires a registered Service Worker; downloads continue when the tab is closed and the browser shows progress.

---

## Exports

| Name                             | Description                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `isBackgroundFetchSupported`     | Check if Background Fetch is available (SW + `registration.backgroundFetch`). |
| `startBackgroundFetch`           | Start a background fetch; returns `BackgroundFetchRegistration`.              |
| `getBackgroundFetchRegistration` | Get a background fetch registration by id (e.g. after reload).                |
| `getBackgroundFetchIds`          | List ids of all active background fetches.                                    |
| `abortBackgroundFetch`           | Abort a background fetch by id.                                               |

---

## 1. `isBackgroundFetchSupported()`

Checks that Service Worker is supported and that `registration.backgroundFetch` exists. **Call before any other Background Fetch call.**

- **Returns:** `Promise<boolean>`.

**Example:**

```typescript
import { isBackgroundFetchSupported } from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;

if (!(await isBackgroundFetchSupported())) {
    console.warn('Background Fetch not available');
    return;
}
// Safe to use startBackgroundFetch, getBackgroundFetchRegistration, etc.
```

---

## 2. `startBackgroundFetch(registration, id, requests, options?)`

Starts a background fetch. The download continues when the tab is closed; the browser shows a progress UI (e.g. in downloads). Returns a **BackgroundFetchRegistration** you can use to track progress and get responses.

**Parameters:**

| Parameter      | Type                                  | Description                                                                                        |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `registration` | `ServiceWorkerRegistration`           | e.g. `await navigator.serviceWorker.ready`                                                         |
| `id`           | `string`                              | Unique id for this fetch (used later in `getBackgroundFetchRegistration` / `abortBackgroundFetch`) |
| `requests`     | `(string \| Request)[]`               | URLs or `Request` objects to fetch                                                                 |
| `options`      | `BackgroundFetchUIOptions` (optional) | See below                                                                                          |

**`BackgroundFetchUIOptions`** (all optional):

| Property        | Type              | Description                                                                                              |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `title`         | `string`          | Title shown in the browser’s progress UI                                                                 |
| `icons`         | `ImageResource[]` | Icons for the UI: `{ src, sizes?, type?, label? }`                                                       |
| `downloadTotal` | `number`          | Estimated total size in bytes; used for progress. If actual download exceeds this, the fetch is aborted. |

- **Returns:** `Promise<BackgroundFetchRegistration>`. Rejects if SW or Background Fetch is not available, or on invalid input (e.g. duplicate `id`, `no-cors` request, quota exceeded).

**Example — start with all options and use the registration:**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;

if (!(await isBackgroundFetchSupported())) {
    return;
}

const id = 'episode-5-' + Date.now();
const bgReg = await startBackgroundFetch(
    reg,
    id,
    ['/ep-5.mp3', '/ep-5-artwork.jpg'],
    {
        title: 'Episode 5: Interesting things',
        icons: [
            {
                src: '/ep-5-icon.png',
                sizes: '300x300',
                type: 'image/png',
                label: 'Episode 5',
            },
        ],
        downloadTotal: 60 * 1024 * 1024, // 60 MB estimate
    }
);

// Use bgReg: progress, result, failureReason, match, matchAll, abort (see below)
```

---

## 3. `getBackgroundFetchRegistration(registration, id)`

Returns the **BackgroundFetchRegistration** for the given id. Use to resume monitoring after a page reload or to check status of a fetch started elsewhere.

- **`registration`** — `ServiceWorkerRegistration`.
- **`id`** — id passed to `startBackgroundFetch`.
- **Returns:** `Promise<BackgroundFetchRegistration | undefined>` — `undefined` if not found or API not supported.

**Example — after reload: list fetches and reattach progress:**

```typescript
import {
    getBackgroundFetchIds,
    getBackgroundFetchRegistration,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const ids = await getBackgroundFetchIds(reg);

for (const id of ids) {
    const bgReg = await getBackgroundFetchRegistration(reg, id);

    if (!bgReg) {
        continue;
    }

    console.log(
        'Fetch',
        bgReg.id,
        'downloaded',
        bgReg.downloaded,
        '/',
        bgReg.downloadTotal
    );

    if (bgReg.result === 'success') {
        console.log('Completed successfully');
    }

    if (bgReg.result === 'failure') {
        console.log('Failed:', bgReg.failureReason);
    }

    bgReg.addEventListener('progress', () => {
        const pct = bgReg.downloadTotal
            ? Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100)
            : 0;
        console.log(`${bgReg.id}: ${pct}%`);
    });
}
```

---

## 4. `getBackgroundFetchIds(registration)`

Returns the list of **active** background fetch ids for this registration. Use to show “My downloads” or to iterate and call `getBackgroundFetchRegistration(reg, id)` for each.

- **`registration`** — `ServiceWorkerRegistration`.
- **Returns:** `Promise<string[]>` — empty array if API not supported.

**Example — list all and show status:**

```typescript
import {
    getBackgroundFetchIds,
    getBackgroundFetchRegistration,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const ids = await getBackgroundFetchIds(reg);

for (const id of ids) {
    const bgReg = await getBackgroundFetchRegistration(reg, id);

    if (!bgReg) {
        continue;
    }

    console.log({
        id: bgReg.id,
        downloaded: bgReg.downloaded,
        downloadTotal: bgReg.downloadTotal,
        result: bgReg.result,
        failureReason: bgReg.failureReason,
    });
}
```

---

## 5. `abortBackgroundFetch(registration, id)`

Aborts the background fetch with the given id. Convenience wrapper: finds the registration by id and calls `bgReg.abort()`.

- **`registration`** — `ServiceWorkerRegistration`.
- **`id`** — id of the fetch.
- **Returns:** `Promise<boolean>` — `true` if the fetch was found and aborted, `false` otherwise.

**Example:**

```typescript
import { abortBackgroundFetch } from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const cancelled = await abortBackgroundFetch(reg, 'my-download-123');

if (cancelled) {
    console.log('Download cancelled');
}
```

**Alternative — abort via the registration object:**

```typescript
const bgReg = await getBackgroundFetchRegistration(reg, id);

if (bgReg) {
    await bgReg.abort(); // same effect
}
```

---

## BackgroundFetchRegistration (returned by `startBackgroundFetch` / `getBackgroundFetchRegistration`)

The object returned by `startBackgroundFetch` and `getBackgroundFetchRegistration` is a [BackgroundFetchRegistration](https://developer.mozilla.org/en-US/docs/Web/API/BackgroundFetchRegistration). You use it to track progress, read result, and get response bodies.

### Properties (read-only)

| Property           | Type      | Description                                                                                                            |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`  | The fetch id.                                                                                                          |
| `uploadTotal`      | `number`  | Total bytes to upload (usually 0 for GET).                                                                             |
| `uploaded`         | `number`  | Bytes uploaded so far.                                                                                                 |
| `downloadTotal`    | `number`  | Total download size in bytes (from options or 0).                                                                      |
| `downloaded`       | `number`  | Bytes downloaded so far.                                                                                               |
| `result`           | `string`  | Initially `""`; on completion `"success"` or `"failure"`.                                                              |
| `failureReason`    | `string`  | Reason if failed: `""`, `"aborted"`, `"bad-status"`, `"fetch-error"`, `"quota-exceeded"`, `"download-total-exceeded"`. |
| `recordsAvailable` | `boolean` | Whether response records are available (for `match` / `matchAll`).                                                     |

### Methods

| Method               | Description                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abort()`            | Aborts this fetch. Returns `Promise<boolean>`.                                                                                                             |
| `match(request)`     | Returns `Promise<BackgroundFetchRecord \| undefined>` for the first matching request (URL or `Request`). Use `record.responseReady` to get the `Response`. |
| `matchAll(request?)` | Returns `Promise<BackgroundFetchRecord[]>` for all (or matching) requests.                                                                                 |

### Event: `progress`

Fired when `uploaded`, `downloaded`, `result`, or `failureReason` changes. Use it to update a progress bar or status text.

**Example — progress and completion:**

```typescript
const bgReg = await startBackgroundFetch(reg, id, urls, {
    title: 'My download',
});

bgReg.addEventListener('progress', () => {
    if (bgReg.downloadTotal > 0) {
        const pct = Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100);
        updateProgressBar(pct);
    }

    if (bgReg.result === 'success') {
        console.log('Download finished successfully');
    }

    if (bgReg.result === 'failure') {
        console.error('Download failed:', bgReg.failureReason);
    }
});
```

**Example — get response for one URL via `match()`:**

```typescript
const bgReg = await startBackgroundFetch(reg, id, ['/video.mp4'], {
    title: 'Video',
});

// After completion (e.g. in progress handler when bgReg.result === 'success'):
const record = await bgReg.match('/video.mp4');

if (record) {
    const response = await record.responseReady;
    const blob = await response.blob();
    // e.g. create object URL, save to IndexedDB, etc.
}
```

**Example — get all responses via `matchAll()`:**

```typescript
const records = await bgReg.matchAll();

for (const record of records) {
    const response = await record.responseReady;
    console.log(record.request.url, response.status);
}
```

---

## Full flow example (all methods)

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;

// 1) Check support
if (!(await isBackgroundFetchSupported())) {
    console.warn('Background Fetch not supported');
    return;
}

// 2) Start a fetch (all options)
const id = 'my-fetch-' + Date.now();
const bgReg = await startBackgroundFetch(
    reg,
    id,
    ['/large-file.zip', '/meta.json'],
    {
        title: 'My download',
        downloadTotal: 100 * 1024 * 1024,
    }
);

// 3) Use registration: progress, result
bgReg.addEventListener('progress', () => {
    const pct = bgReg.downloadTotal
        ? Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100)
        : 0;
    console.log('Progress:', pct + '%');

    if (bgReg.result === 'success') {
        console.log('Done');
    }

    if (bgReg.result === 'failure') {
        console.log('Failed:', bgReg.failureReason);
    }
});

// 4) Later: list all fetches
const ids = await getBackgroundFetchIds(reg);
console.log('Active fetches:', ids);

// 5) Get same registration by id (e.g. after reload)
const same = await getBackgroundFetchRegistration(reg, id);

if (same) {
    console.log(
        'Resumed:',
        same.downloaded,
        '/',
        same.downloadTotal,
        same.result
    );
}

// 6) Abort by id
await abortBackgroundFetch(reg, id);
```

---

## Import

**Subpath (smaller bundle):**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';
```

**Main client entry:**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client';
```
