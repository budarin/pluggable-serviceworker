import {
    initServiceWorker,
    type RequiredOptions,
    type ServiceWorkerInitOptions,
} from '../index.js';

import { offlineFirst } from '../presets/offlineFirst.js';
import { skipWaiting } from '../plugins/skipWaiting.js';
import { claim } from '../plugins/claim.js';

const plugins: readonly [
    ...typeof offlineFirst,
    typeof skipWaiting,
    typeof claim,
] = [...offlineFirst, skipWaiting, claim];

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется сразу (skipWaiting + claim).
 */
export function activateImmediatelyServiceWorker(
    options: ServiceWorkerInitOptions & RequiredOptions<typeof plugins>
): void {
    initServiceWorker(plugins, options);
}
