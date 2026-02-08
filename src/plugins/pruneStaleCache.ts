import type { PluginContext, ServiceWorkerPlugin } from '../index.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';

export interface PruneStaleCacheConfig {
    cacheName: string;
    assets: string[];
}

/**
 * При activate: обходит ключи кэша и удаляет записи, чей URL не входит в config.assets.
 */
export function pruneStaleCache(
    config: PruneStaleCacheConfig
): ServiceWorkerPlugin<PluginContext> {
    const { cacheName, assets } = config;
    const assetHrefs = new Set(assets.map((url) => normalizeUrl(url)));
    return {
        name: 'pruneStaleCache',
        activate: async () => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            await Promise.all(
                keys.map(async (request) => {
                    if (!assetHrefs.has(normalizeUrl(request.url))) {
                        await cache.delete(request);
                    }
                })
            );
        },
    };
}
