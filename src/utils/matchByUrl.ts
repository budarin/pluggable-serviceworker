/**
 * Matches a cached response by URL only, ignoring request mode, credentials, etc.
 * Use when the cache stores a single variant per URL (e.g. precache).
 */
export async function matchByUrl(
    cache: Cache,
    request: Request
): Promise<Response | undefined> {
    return cache.match(request.url);
}
