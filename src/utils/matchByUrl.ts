export interface MatchByUrlOptions {
    /**
     * Ignore query string when matching. E.g. request to /a.js?v=1 will match cache entry for /a.js.
     * Default true.
     */
    ignoreSearch?: boolean;
    /**
     * Ignore the response's Vary header when matching. E.g. cached response with Vary: Origin will
     * be returned even if the current request has a different or no Origin. Default true.
     */
    ignoreVary?: boolean;
}

/**
 * Matches a cached response by URL (path), ignoring request mode and credentials.
 *
 * **Why this exists:** `cache.match(event.request)` requires a full match (URL + mode + credentials).
 * Requests from the page have their own mode (scripts, styles, etc.); precache stores with a different
 * mode. No match → cache miss → "Failed to fetch". This helper matches by URL only so precached assets are found.
 *
 * Use when the cache stores a single variant per path (e.g. precache). With `ignoreSearch: true`
 * (default), requests with query params match the entry stored without query. With `ignoreVary: true`
 * (default), cached responses with Vary header are returned regardless of request headers.
 */
export async function matchByUrl(
    cache: Cache,
    request: Request,
    options?: MatchByUrlOptions
): Promise<Response | undefined> {
    const ignoreSearch = options?.ignoreSearch ?? true;
    const ignoreVary = options?.ignoreVary ?? true;
    return cache.match(request, { ignoreSearch, ignoreVary });
}
