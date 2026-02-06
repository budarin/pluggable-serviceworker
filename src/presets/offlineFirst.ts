import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';
import { precache } from '../plugins/precache.js';
import { serveFromCache } from '../plugins/serveFromCache.js';

/** Пресет: precache при install + отдача из кеша в fetch (при промахе — сеть через фреймворк). */
export const offlineFirst: ServiceWorkerPlugin<OfflineFirstContext>[] = [
    precache,
    serveFromCache,
];
