/** Демо: только activateOnSignal. Работает после pnpm run build (dist/sw.js). */
import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';
import { activateOnSignalServiceWorker } from '@budarin/pluggable-serviceworker/sw';

const cacheName = 'offline-demo-v1';
const assets = ['/', '/assets/main.js', '/assets/service-worker.js'];

activateOnSignalServiceWorker({
    assets,
    cacheName,
    skipWaitingMessageType: SW_MSG_SKIP_WAITING,
    logger: typeof console !== 'undefined' ? console : undefined,
});
