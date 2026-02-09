import { normalizeUrl } from './normalizeUrl.js';

/**
 * Проверяет, входит ли URL запроса в список assets (сравнение по нормализованным URL).
 * Используется, чтобы решать, обрабатывать ли запрос как «один из закэшированных ассетов».
 */
export function isRequestUrlInAssets(
    requestUrl: string,
    assets: string[]
): boolean {
    try {
        const requestHref = normalizeUrl(requestUrl);

        return assets.some((asset) => normalizeUrl(asset) === requestHref);
    } catch {
        return false;
    }
}
