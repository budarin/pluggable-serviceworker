import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

/** Хелпер для переиспользования в своих плагинах (свой кэш, фильтр по URL). */
export async function staleWhileRevalidateFetch(
    event: FetchEvent,
    cacheName: string
): Promise<Response> {
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
}

export interface StaleWhileRevalidateConfig {
    cacheName: string;
}

export function staleWhileRevalidate(
    config: StaleWhileRevalidateConfig
): ServiceWorkerPlugin<PluginContext> {
    const { cacheName } = config;
    return {
        name: 'staleWhileRevalidate',
        fetch: (event) => staleWhileRevalidateFetch(event, cacheName),
    };
}
