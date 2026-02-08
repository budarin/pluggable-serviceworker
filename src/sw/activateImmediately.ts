import type { ServiceWorkerInitOptions } from '../index.js';
import { initServiceWorker } from '../index.js';

import {
    offlineFirst,
    type OfflineFirstConfig,
} from '../presets/offlineFirst.js';
import { skipWaiting } from '../plugins/skipWaiting.js';
import { claim } from '../plugins/claim.js';

export interface ActivateImmediatelyOptions
    extends ServiceWorkerInitOptions,
        OfflineFirstConfig {}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется сразу (skipWaiting + claim).
 */
export function activateImmediatelyServiceWorker(
    options: ActivateImmediatelyOptions
): void {
    initServiceWorker(
        [...offlineFirst(options), skipWaiting, claim],
        options
    );
}
