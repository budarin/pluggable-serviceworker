/** Демо: только activateOnSignal. Работает после pnpm run build (dist/sw.js). */
import { activateOnSignalServiceWorker } from '@budarin/pluggable-serviceworker/sw';

const cacheName = 'offline-demo-v1';
const assets = ['/', '/assets/main.js'];

activateOnSignalServiceWorker({
    assets,
    cacheName,
    claimMessageType: 'SW_ACTIVATE',
    logger: typeof console !== 'undefined' ? console : undefined,
});
