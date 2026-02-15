// Регистрация SW
export { registerServiceWorkerWithClaimWorkaround } from './registration/index.js';
export { onNewServiceWorkerVersion } from './registration/index.js';

// Сообщения
export { onServiceWorkerMessage } from './messaging/index.js';
export {
    postMessageToServiceWorker,
    type PostMessageToServiceWorkerOptions,
} from './messaging/index.js';
export {
    getServiceWorkerVersion,
    type GetServiceWorkerVersionOptions,
} from './messaging/index.js';

// Доступность / ping
export { isServiceWorkerSupported } from './health/index.js';
export {
    pingServiceWorker,
    type PingServiceWorkerResult,
    type PingServiceWorkerOptions,
} from './health/index.js';

// Background Fetch
export { isBackgroundFetchSupported } from './backgroundFetch/index.js';
export { startBackgroundFetch } from './backgroundFetch/index.js';
export { getBackgroundFetchRegistration } from './backgroundFetch/index.js';
export { abortBackgroundFetch } from './backgroundFetch/index.js';
export { getBackgroundFetchIds } from './backgroundFetch/index.js';
