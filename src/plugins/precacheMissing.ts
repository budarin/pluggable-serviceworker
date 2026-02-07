import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';

/**
 * При install: по списку assets и ключам кэша определяет отсутствующие в кэше URL
 * и добавляет только их через cache.addAll.
 */
export const precacheMissing: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'precacheMissing',
    install: async (_event, context) => {
        const cache = await caches.open(context.cacheName);
        const keys = await cache.keys();
        const cachedHrefs = new Set(keys.map((r) => normalizeUrl(r.url)));
        const missing = context.assets.filter(
            (url) => !cachedHrefs.has(normalizeUrl(url))
        );

        if (missing.length > 0) {
            await cache.addAll(missing);
        }
    },
};
