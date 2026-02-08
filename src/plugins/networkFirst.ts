import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

interface NetworkFirstContext extends PluginContext {
    cacheName: string;
}

export const networkFirst: ServiceWorkerPlugin<NetworkFirstContext> = {
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
