import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

export interface PrecacheConfig {
    cacheName: string;
    assets: string[];
}

export function precache(config: PrecacheConfig): ServiceWorkerPlugin<PluginContext> {
    const { cacheName, assets } = config;
    return {
        name: 'precache',
        install: async () => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
        },
    };
}
