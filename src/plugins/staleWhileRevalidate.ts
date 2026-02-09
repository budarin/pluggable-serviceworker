import type { Plugin } from '../index.js';

export interface StaleWhileRevalidateConfig {
    cacheName: string;
}

export function staleWhileRevalidate(
    config: StaleWhileRevalidateConfig
): Plugin {
    const { cacheName } = config;

    return {
        name: 'staleWhileRevalidate',

        fetch: async (event) => {
            const cache = await caches.open(cacheName);
            const cached = await cache.match(event.request);
            const revalidate = fetch(event.request).then(async (response) => {
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
