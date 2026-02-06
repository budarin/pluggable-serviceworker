import {
    initServiceWorker,
    type OfflineFirstContext,
    type ServiceWorkerInitOptions,
} from '../index.js';
import { offlineFirst } from '../presets/offlineFirst.js';
import { skipWaiting } from '../plugins/skipWaiting.js';
import { claim } from '../plugins/claim.js';

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется сразу (skipWaiting + claim).
 */
export function activateImmediatelyServiceWorker(
    options: OfflineFirstContext & ServiceWorkerInitOptions
): void {
    initServiceWorker([...offlineFirst, skipWaiting, claim], options);
}
