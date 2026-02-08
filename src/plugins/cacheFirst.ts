import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

interface CacheFirstContext extends PluginContext {
    cacheName: string;
}

export const cacheFirst: ServiceWorkerPlugin<CacheFirstContext> = {
    name: 'cacheFirst',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);
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
