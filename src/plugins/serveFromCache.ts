import type { Plugin } from '../index.js';

export interface ServeFromCacheConfig {
    cacheName: string;
}

export function serveFromCache(config: ServeFromCacheConfig): Plugin {
    const { cacheName } = config;

    return {
        name: 'serveFromCache',

        fetch: async (event) => {
            const cache = await caches.open(cacheName);
            return cache.match(event.request) ?? undefined;
        },
    };
}
