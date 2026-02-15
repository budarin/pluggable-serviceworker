import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';

/**
 * Проверяет поддержку Background Fetch API в текущем окружении.
 *
 * Возвращает true, если доступны Service Worker и registration.backgroundFetch.
 * Используйте перед вызовом startBackgroundFetch и других утилит Background Fetch.
 */
export async function isBackgroundFetchSupported(): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        return 'backgroundFetch' in registration;
    } catch {
        return false;
    }
}
