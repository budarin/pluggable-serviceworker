import type { Plugin } from '../index.js';

import { normalizeUrl } from '../utils/normalizeUrl.js';

export interface PrecacheMissingConfig {
    cacheName: string;
    assets: string[];
    order?: number;
}

/**
 * При install: по списку assets и ключам кэша определяет отсутствующие в кэше URL
 * и добавляет только их через cache.addAll.
 */
export function precacheMissing(config: PrecacheMissingConfig): Plugin {
    const { cacheName, assets, order = 0 } = config;

    return {
        order,
        name: 'precacheMissing',

        install: async () => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            const cachedHrefs = new Set(keys.map((r) => normalizeUrl(r.url)));
            const hrefToUrl = new Map(
                assets.map((url) => [normalizeUrl(url), url] as const)
            );
            const missing = [...hrefToUrl.keys()].filter(
                (href) => !cachedHrefs.has(href)
            ).map((href) => hrefToUrl.get(href)!);

            if (missing.length > 0) {
                await cache.addAll(missing);
            }
        },
    };
}
