import type { ServiceWorkerInitOptions } from '../index.js';
import type { OfflineFirstConfig } from '../presets/offlineFirst.js';

import { claim } from '../plugins/claim.js';
import { initServiceWorker } from '../index.js';
import { skipWaiting } from '../plugins/skipWaiting.js';
import { offlineFirst } from '../presets/offlineFirst.js';

export interface ActivateImmediatelyOptions
    extends ServiceWorkerInitOptions, OfflineFirstConfig {}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется сразу (skipWaiting + claim).
 */
export function activateImmediatelyServiceWorker(
    options: ActivateImmediatelyOptions
): void {
    initServiceWorker([...offlineFirst(options), skipWaiting, claim], options);
}
