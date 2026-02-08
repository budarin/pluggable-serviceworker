import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

interface StaleWhileRevalidateContext extends PluginContext {
    cacheName: string;
}

export const staleWhileRevalidate: ServiceWorkerPlugin<StaleWhileRevalidateContext> = {
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
