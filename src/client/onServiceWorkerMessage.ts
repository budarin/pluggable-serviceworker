/**
 * Подписка на сообщения от Service Worker по типу.
 *
 * Пример:
 * onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', () => {
 *     // Показать баннер "доступна новая версия"
 * });
 */
export function onServiceWorkerMessage(
    messageType: string,
    handler: (event: MessageEvent) => void
): void {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data as unknown;

        if (
            data == null ||
            typeof data !== 'object' ||
            !('type' in data) ||
            (data as { type: unknown }).type !== messageType
        ) {
            return;
        }

        handler(event);
    });
}

