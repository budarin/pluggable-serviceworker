import type { Plugin } from '../index.js';

export interface NetworkFirstConfig {
    cacheName: string;
}

export function networkFirst(config: NetworkFirstConfig): Plugin {
    const { cacheName } = config;

    return {
        name: 'networkFirst',

        fetch: async (event) => {
            const cache = await caches.open(cacheName);

            try {
                const response = await fetch(event.request);

                if (response.ok) {
                    await cache.put(event.request, response.clone());
                }

                return response;
            } catch {
                return (await cache.match(event.request)) ?? undefined;
            }
        },
    };
}
