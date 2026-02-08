import type { PluginContext, ServiceWorkerPlugin } from '../index.js';
import { isAssetRequest } from '../utils/isAssetRequest.js';

interface RestoreAssetToCacheContext extends PluginContext {
    assets: string[];
    cacheName: string;
}

/**
 * Для запросов, чей URL входит в context.assets: сначала отдаёт из кеша, если есть.
 * Если в кеше нет — запрашивает из сети, кладёт в кеш и возвращает ответ (восстановление в кеше).
 * Если запрос не из списка assets — возвращает undefined (передаёт следующему плагину).
 */
export const restoreAssetToCache: ServiceWorkerPlugin<RestoreAssetToCacheContext> = {
    name: 'restoreAssetToCache',
    fetch: async (event, context) => {
        if (!isAssetRequest(event.request.url, context.assets))
            return undefined;

        const cache = await caches.open(context.cacheName);
        const cached = await cache.match(event.request);

        if (cached) {
            return cached;
        }

        try {
            const response = await fetch(event.request);

            if (response.ok) {
                await cache.put(event.request, response.clone());
            }

            return response;
        } catch {
            return undefined;
        }
    },
};
