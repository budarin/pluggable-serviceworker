import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';

export const cacheFirst: ServiceWorkerPlugin<OfflineFirstContext> = {
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
