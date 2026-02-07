import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';

/**
 * При activate: обходит ключи кэша и удаляет записи, чей URL не входит в context.assets.
 */
export const pruneStaleCache: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'pruneStaleCache',
    activate: async (_event, context) => {
        const cache = await caches.open(context.cacheName);
        const assetHrefs = new Set(
            context.assets.map((url) => normalizeUrl(url))
        );
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
