import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';

/**
 * Запускает фоновую загрузку ресурсов через Background Fetch API.
 *
 * Требует зарегистрированный Service Worker с поддержкой Background Fetch.
 * Загрузка продолжается даже при закрытии вкладки; прогресс отображается браузером.
 *
 * @param registration - регистрация Service Worker (например, из navigator.serviceWorker.ready)
 * @param id - уникальный идентификатор загрузки (для последующего getBackgroundFetchRegistration / abort)
 * @param requests - URL или Request объекты для загрузки
 * @param options - опции UI (title, icons, downloadTotal)
 * @returns Promise с BackgroundFetchRegistration или reject при отсутствии поддержки/ошибке
 */
export async function startBackgroundFetch(
    registration: ServiceWorkerRegistration,
    id: string,
    requests: (string | Request)[],
    options?: BackgroundFetchUIOptions
): Promise<BackgroundFetchRegistration> {
    if (!isServiceWorkerSupported()) {
        throw new Error('Service Worker is not supported');
    }
    const manager = registration.backgroundFetch;
    if (!manager) {
        throw new Error('Background Fetch API is not supported');
    }
    return manager.fetch(id, requests, options);
}
