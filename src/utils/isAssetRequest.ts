import { normalizeUrl } from './normalizeUrl.js';

export function isAssetRequest(requestUrl: string, assets: string[]): boolean {
    try {
        const requestHref = normalizeUrl(requestUrl);
        return assets.some((asset) => normalizeUrl(asset) === requestHref);
    } catch {
        return false;
    }
}
