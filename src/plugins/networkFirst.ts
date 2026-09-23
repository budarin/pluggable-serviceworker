import type { Plugin } from '../index.js';
import { cachePut } from '../utils/cachePut.js';
import { matchByUrl } from '../utils/matchByUrl.js';

export interface NetworkFirstConfig {
    cacheName: string;
    order?: number;
}

export function networkFirst(config: NetworkFirstConfig): Plugin {
    const { cacheName, order = 0 } = config;

    return {
        order,
        name: 'networkFirst',

        fetch: async (event, context) => {
            const cache = await caches.open(cacheName);

            try {
                const response = await context.fetchPassthrough(event.request);

                if (response.ok) {
                    await cachePut(cache, event.request, response.clone());
                }

                return response;
            } catch {
                return (await matchByUrl(cache, event.request)) ?? undefined;
            }
        },
    };
}
