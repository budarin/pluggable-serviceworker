import type { Plugin } from '../index.js';

export interface PrecacheConfig {
    cacheName: string;
    assets: string[];
    order?: number;
}

export function precache(config: PrecacheConfig): Plugin {
    const { cacheName, assets, order = 0 } = config;

    return {
        order,
        name: 'precache',

        install: async () => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
        },
    };
}
