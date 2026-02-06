import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';

export const serveFromCache: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'serveFromCache',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);
        const options = context.cacheMatchIgnoreSearch
            ? ({ ignoreSearch: true } as CacheQueryOptions)
            : undefined;
        return cache.match(event.request, options) ?? undefined;
    },
};
