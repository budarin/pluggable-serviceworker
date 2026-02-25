import { normalizeUrl } from './normalizeUrl.js';

/**
 * Resolves asset paths with base. Returns full URLs.
 * @param assets - Paths or URLs, e.g. ['/assets/main.js', 'https://cdn.example.com/lib.js']
 * @param base - Base path like '/' or '/my-app/'
 */
export function resolveAssetUrls(
    assets: string[],
    base?: string
): string[] {
    if (!base || base === '/') {
        return assets.map((url) => normalizeUrl(url));
    }

    const basePath = base.replace(/\/$/, '') || '';

    return assets.map((asset) => {
        if (asset.startsWith('http://') || asset.startsWith('https://')) {
            return asset;
        }
        const path = asset.startsWith('/') ? asset : `/${asset}`;
        const url = basePath + path;
        return normalizeUrl(url);
    });
}
