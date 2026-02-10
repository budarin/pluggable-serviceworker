/** Демо: только immediatelyActivateUpdateOnSignalSW. Работает после pnpm run build (dist/sw.js). */
import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';
import { immediatelyActivateUpdateOnSignalSW } from '@budarin/pluggable-serviceworker/sw';

const cacheName = 'offline-demo-v1';
const assets = ['/', '/assets/main.js', '/assets/service-worker.js'];

immediatelyActivateUpdateOnSignalSW({
    assets,
    cacheName,
    skipWaitingMessageType: SW_MSG_SKIP_WAITING,
    version: 'offline-demo-v1',
});
