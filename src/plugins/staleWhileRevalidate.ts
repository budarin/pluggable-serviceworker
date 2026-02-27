import type { Plugin } from '../index.js';
import { matchByUrl } from '../utils/matchByUrl.js';

export interface StaleWhileRevalidateConfig {
    cacheName: string;
    order?: number;
}

export function staleWhileRevalidate(
    config: StaleWhileRevalidateConfig
): Plugin {
    const { cacheName, order = 0 } = config;

    return {
        order,
        name: 'staleWhileRevalidate',

        fetch: async (event, context) => {
            const cache = await caches.open(cacheName);
            const cached = await matchByUrl(cache, event.request);
            const revalidate = context.fetchPassthrough(event.request).then(async (response) => {
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
}
