import {
    initServiceWorker,
    type RequiredOptions,
    type ServiceWorkerInitOptions,
} from '../index.js';

import { offlineFirst } from '../presets/offlineFirst.js';

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется при следующем визите страницы.
 * Вызови с options (assets, cacheName, logger, onError и т.д.) из своего SW-файла.
 */
export function activateOnNextVisitServiceWorker(
    options: ServiceWorkerInitOptions & RequiredOptions<typeof offlineFirst>
): void {
    initServiceWorker(offlineFirst, options);
}
