import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';

export const staleWhileRevalidate: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'staleWhileRevalidate',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);
        const cached = await cache.match(event.request);
        const revalidate = fetch(event.request).then(async (response) => {
            if (response.ok) {
                await cache.put(event.request, response.clone());
            }

            return response;
        });

        if (cached) {
            void revalidate;
            return cached;
        }

        return revalidate;
    },
};
