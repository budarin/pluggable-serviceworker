import type { Plugin } from '../index.js';

import { resolveAssetUrls } from '../utils/resolveAssetUrls.js';

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

        install: async (_event, context) => {
            const resolved = resolveAssetUrls(assets, context.base);
            const cache = await caches.open(cacheName);
            await cache.addAll(resolved);
        },
    };
}
