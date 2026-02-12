import type { Plugin } from '../index.js';

import { precache } from '../plugins/precache.js';
import { serveFromCache } from '../plugins/serveFromCache.js';

export interface OfflineFirstConfig {
    cacheName: string;
    assets: string[];
    order?: number;
}

/** Пресет: precache при install + отдача из кеша в fetch (при промахе — сеть через фреймворк). */
export function offlineFirst(
    config: OfflineFirstConfig
): readonly [Plugin, Plugin] {
    return [precache(config), serveFromCache(config)];
}
