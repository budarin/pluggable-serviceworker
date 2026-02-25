import type { Plugin } from '../index.js';
import { matchByUrl } from '../utils/matchByUrl.js';

export interface ServeFromCacheConfig {
    cacheName: string;
    order?: number;
}

export function serveFromCache(config: ServeFromCacheConfig): Plugin {
    const { cacheName, order = 0 } = config;

    return {
        order,
        name: 'serveFromCache',

        fetch: async (event) => {
            const cache = await caches.open(cacheName);

            return (await matchByUrl(cache, event.request)) ?? undefined;
        },
    };
}
