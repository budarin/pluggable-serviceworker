import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';

/**
 * Возвращает регистрацию фоновой загрузки по id.
 *
 * Полезно для проверки статуса и прогресса уже запущенной загрузки
 * (в том числе после перезагрузки страницы).
 *
 * @param registration - регистрация Service Worker
 * @param id - идентификатор загрузки, переданный в startBackgroundFetch
 * @returns BackgroundFetchRegistration или undefined, если загрузка не найдена
 */
export async function getBackgroundFetchRegistration(
    registration: ServiceWorkerRegistration,
    id: string
): Promise<BackgroundFetchRegistration | undefined> {
    if (!isServiceWorkerSupported()) {
        return undefined;
    }
    const manager = registration.backgroundFetch;
    if (!manager) {
        return undefined;
    }
    return manager.get(id);
}
