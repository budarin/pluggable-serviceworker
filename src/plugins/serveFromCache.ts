import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface ServeFromCacheContext extends PluginContext {
    cacheName: string;
    cacheMatchIgnoreSearch?: boolean;
}

export const serveFromCache: ServiceWorkerPlugin<ServeFromCacheContext> = {
    name: 'serveFromCache',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);
        const options = context.cacheMatchIgnoreSearch
            ? ({ ignoreSearch: true } as CacheQueryOptions)
            : undefined;
        return cache.match(event.request, options) ?? undefined;
    },
};
