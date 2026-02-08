import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface CacheFirstConfig {
    cacheName: string;
}

export function cacheFirst(
    config: CacheFirstConfig
): ServiceWorkerPlugin<PluginContext> {
    const { cacheName } = config;
    return {
        name: 'cacheFirst',
        fetch: async (event) => {
            const cache = await caches.open(cacheName);
            const cached = await cache.match(event.request);
            if (cached) return cached;

            try {
                const response = await fetch(event.request);
                if (response.ok) {
                    await cache.put(event.request, response.clone());
                }
                return response;
            } catch {
                return undefined;
            }
        },
    };
}
