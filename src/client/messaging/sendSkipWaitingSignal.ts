import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';

/**
 * Sends the skip-waiting signal to the **waiting** Service Worker (the one pending activation),
 * not to the active one. The waiting worker must use the `skipWaitingOnMessage` plugin
 * (or handle this message type) and call `skipWaiting()` when it receives it.
 *
 * Uses `navigator.serviceWorker.ready` to get the registration and sends the message to
 * `registration.waiting` if present.
 *
 * @returns `true` if the message was sent to a waiting worker, `false` if SW is not supported,
 *   registration is not ready, or there is no waiting worker.
 */
export async function sendSkipWaitingSignal(): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.waiting) {
            return false;
        }
        registration.waiting.postMessage({ type: SW_MSG_SKIP_WAITING });
        return true;
    } catch {
        return false;
    }
}
