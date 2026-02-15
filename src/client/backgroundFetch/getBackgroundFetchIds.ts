import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';

/**
 * Возвращает список id активных фоновых загрузок.
 *
 * @param registration - регистрация Service Worker
 * @returns массив id загрузок (пустой, если API не поддерживается)
 */
export async function getBackgroundFetchIds(
    registration: ServiceWorkerRegistration
): Promise<string[]> {
    if (!isServiceWorkerSupported()) {
        return [];
    }
    const manager = registration.backgroundFetch;
    if (!manager) {
        return [];
    }
    return manager.getIds();
}
