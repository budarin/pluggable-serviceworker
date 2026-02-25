import type { Plugin } from '../index.js';
import { matchByUrl } from '../utils/matchByUrl.js';

export interface CacheFirstConfig {
    cacheName: string;
    order?: number;
}

export function cacheFirst(config: CacheFirstConfig): Plugin {
    const { cacheName, order = 0 } = config;

    return {
        order,
        name: 'cacheFirst',

        fetch: async (event, context) => {
            const cache = await caches.open(cacheName);
            const cached = await matchByUrl(cache, event.request);

            if (cached) {
                return cached;
            }

            try {
                const headers = new Headers(event.request.headers);
                headers.set(context.passthroughHeader!, '1');
                const response = await fetch(new Request(event.request, { headers }));

                if (response.ok) {
                    await cache.put(event.request, response.clone());
                }

                return response;
            } catch {
                return undefined;
            }
        },
    };
}
