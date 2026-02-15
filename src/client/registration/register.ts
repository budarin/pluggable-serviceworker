/**
 * Регистрирует Service Worker. После ready, если страница ещё не под контролем
 * (navigator.serviceWorker.controller === null), один раз перезагружает страницу.
 * Можно использовать с любым SW; особенно важно, когда в SW в activate вызывается
 * clients.claim() — в этом случае обходится баг браузера (https://issues.chromium.org/issues/482903583).
 */
export async function registerServiceWorkerWithClaimWorkaround(
    scriptURL: string,
    options?: RegistrationOptions
): Promise<ServiceWorkerRegistration | undefined> {
    if (!('serviceWorker' in navigator)) {
        return undefined;
    }

    const reg = await navigator.serviceWorker.register(scriptURL, options);
    await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller != null) {
        return reg;
    }

    const key = `pluggable-sw-reload-${reg.scope}`;
    try {
        if (sessionStorage.getItem(key) != null) {
            return reg;
        }
        sessionStorage.setItem(key, '1');
        (location as Location).reload();
    } catch {
        return reg;
    }

    return reg;
}
