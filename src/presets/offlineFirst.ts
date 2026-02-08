import type { ServiceWorkerPlugin } from '../index.js';

import { precache } from '../plugins/precache.js';
import { serveFromCache } from '../plugins/serveFromCache.js';

export interface OfflineFirstConfig {
    cacheName: string;
    assets: string[];
}

/** Пресет: precache при install + отдача из кеша в fetch (при промахе — сеть через фреймворк). */
export function offlineFirst(
    config: OfflineFirstConfig
): readonly [ServiceWorkerPlugin, ServiceWorkerPlugin] {
    return [precache(config), serveFromCache(config)];
}
