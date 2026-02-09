import type { ServiceWorkerInitOptions } from '../index.js';
import type { OfflineFirstConfig } from '../presets/offlineFirst.js';

import { initServiceWorker } from '../index.js';
import { offlineFirst } from '../presets/offlineFirst.js';

export interface ActivateOnNextVisitOptions
    extends ServiceWorkerInitOptions, OfflineFirstConfig {}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется при следующем визите страницы.
 */
export function activateOnNextVisitServiceWorker(
    options: ActivateOnNextVisitOptions
): void {
    initServiceWorker(offlineFirst(options), options);
}
