import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface ServeFromCacheConfig {
    cacheName: string;
}

export function serveFromCache(
    config: ServeFromCacheConfig
): ServiceWorkerPlugin<PluginContext> {
    const { cacheName } = config;
    return {
        name: 'serveFromCache',
        fetch: async (event) => {
            const cache = await caches.open(cacheName);
            return cache.match(event.request) ?? undefined;
        },
    };
}
