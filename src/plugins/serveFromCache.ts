import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface ServeFromCacheContext extends PluginContext {
    cacheName: string;
}

export const serveFromCache: ServiceWorkerPlugin<ServeFromCacheContext> = {
    name: 'serveFromCache',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);
        return cache.match(event.request) ?? undefined;
    },
};
