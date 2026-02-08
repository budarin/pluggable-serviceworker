import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface PrecacheContext extends PluginContext {
    assets: string[];
    cacheName: string;
}

export const precache: ServiceWorkerPlugin<PrecacheContext> = {
    name: 'precache',
    install: async (_event, context) => {
        const cache = await caches.open(context.cacheName);
        await cache.addAll(context.assets);
    },
};
