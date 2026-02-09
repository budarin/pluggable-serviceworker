import type { ServiceWorkerInitOptions } from '../index.js';
import type { OfflineFirstConfig } from '../presets/offlineFirst.js';

import { initServiceWorker } from '../index.js';
import { offlineFirst } from '../presets/offlineFirst.js';

export interface ActivateAndUpdateOnNextVisitSWOptions
    extends ServiceWorkerInitOptions, OfflineFirstConfig {}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется и обновляется при следующем визите страницы.
 */
export function activateAndUpdateOnNextVisitSW(
    options: ActivateAndUpdateOnNextVisitSWOptions
): void {
    initServiceWorker(offlineFirst(options), options);
}
