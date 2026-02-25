import type { Plugin } from '../index.js';
import { matchByUrl } from '../utils/matchByUrl.js';
import { normalizeUrl } from '../utils/normalizeUrl.js';
import { resolveAssetUrls } from '../utils/resolveAssetUrls.js';

export interface RestoreAssetToCacheConfig {
    cacheName: string;
    assets: string[];
    order?: number;
}

/**
 * Для запросов, чей URL входит в config.assets: сначала отдаёт из кеша, если есть.
 * Если в кеше нет — запрашивает из сети, кладёт в кеш и возвращает ответ (восстановление в кеше).
 * Если запрос не из списка assets — возвращает undefined (передаёт следующему плагину).
 */
export function restoreAssetToCache(config: RestoreAssetToCacheConfig): Plugin {
    const { cacheName, assets, order = 0 } = config;

    let cachedHrefs: { base: string | undefined; hrefs: Set<string> } | null =
        null;

    return {
        order,
        name: 'restoreAssetToCache',

        fetch: async (event, context) => {
            if (
                !cachedHrefs ||
                cachedHrefs.base !== context.base
            ) {
                cachedHrefs = {
                    base: context.base,
                    hrefs: new Set(
                        resolveAssetUrls(assets, context.base).map((url) =>
                            normalizeUrl(url)
                        )
                    ),
                };
            }

            const hrefs = cachedHrefs.hrefs;
            if (!hrefs.has(normalizeUrl(event.request.url))) {
                return undefined;
            }

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
