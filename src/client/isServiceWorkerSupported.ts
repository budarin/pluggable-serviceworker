/**
 * Проверяет поддержку Service Worker в текущем окружении.
 *
 * Используйте перед вызовом клиентских утилит библиотеки, если код
 * может выполняться вне браузера (SSR, тесты) или в старых браузерах.
 */
export function isServiceWorkerSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

