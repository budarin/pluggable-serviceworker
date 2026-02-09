import type { ServiceWorkerInitOptions } from '../index.js';
import type { OfflineFirstConfig } from '../presets/offlineFirst.js';

import { claim } from '../plugins/claim.js';
import { initServiceWorker } from '../index.js';
import { skipWaiting } from '../plugins/skipWaiting.js';
import { offlineFirst } from '../presets/offlineFirst.js';

export interface ImmediatelyActivateAndUpdateSWOptions
    extends ServiceWorkerInitOptions, OfflineFirstConfig {}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется и обновляется сразу (skipWaiting + claim).
 */
export function immediatelyActivateAndUpdateSW(
    options: ImmediatelyActivateAndUpdateSWOptions
): void {
    initServiceWorker([...offlineFirst(options), skipWaiting, claim], options);
}
