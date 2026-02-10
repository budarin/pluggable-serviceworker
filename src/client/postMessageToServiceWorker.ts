import { isServiceWorkerSupported } from './isServiceWorkerSupported.js';

export interface PostMessageToServiceWorkerOptions {
    /**
     * Ждать ли готовности регистрации SW, если у страницы пока нет контроллера.
     * По умолчанию true.
     */
    waitForReady?: boolean;
}

/**
 * Отправляет message в Service Worker.
 *
 * Возвращает true, если сообщение было отправлено (нашёлся controller или active SW).
 * Возвращает false, если SW не поддерживается или активный воркер не найден.
 */
export async function postMessageToServiceWorker(
    message: unknown,
    options: PostMessageToServiceWorkerOptions = {}
): Promise<boolean> {
    if (!isServiceWorkerSupported()) {
        return false;
    }

    const controller = navigator.serviceWorker.controller;
    if (controller) {
        controller.postMessage(message);
        return true;
    }

    if (options.waitForReady === false) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
            registration.active.postMessage(message);
            return true;
        }
    } catch {
        // ignore
    }

    return false;
}

