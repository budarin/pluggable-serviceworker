import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';

export const networkFirst: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'networkFirst',
    fetch: async (event, context) => {
        const cache = await caches.open(context.cacheName);

        try {
            const response = await fetch(event.request);

            if (response.ok) {
                await cache.put(event.request, response.clone());
            }

            return response;
        } catch {
            return (await cache.match(event.request)) ?? undefined;
        }
    },
};
