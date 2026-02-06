import type { ServiceWorkerPlugin, OfflineFirstContext } from '../index.js';

export const precache: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'precache',
    install: async (_event, context) => {
        const cache = await caches.open(context.cacheName);
        await cache.addAll(context.assets);
    },
};
