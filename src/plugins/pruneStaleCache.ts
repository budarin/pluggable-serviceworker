import type { Plugin } from '../index.js';

import { normalizeUrl } from '../utils/normalizeUrl.js';
import { resolveAssetUrls } from '../utils/resolveAssetUrls.js';

export interface PruneStaleCacheConfig {
    cacheName: string;
    assets: string[];
    order?: number;
}

/**
 * При activate: обходит ключи кэша и удаляет записи, чей URL не входит в config.assets.
 */
export function pruneStaleCache(config: PruneStaleCacheConfig): Plugin {
    const { cacheName, assets, order = 0 } = config;

    return {
        order,
        name: 'pruneStaleCache',

        activate: async (_event, context) => {
            const resolved = resolveAssetUrls(assets, context.base);
            const assetHrefs = new Set(resolved.map((url) => normalizeUrl(url)));
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            await Promise.all(
                keys.map(async (request) => {
                    if (!assetHrefs.has(normalizeUrl(request.url))) {
                        await cache.delete(request);
                    }
                })
            );
        },
    };
}
