/**
 * Подписка на сообщения от Service Worker по типу.
 *
 * Пример:
 * const unsubscribe = onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', () => {
 *     // Показать баннер "доступна новая версия"
 * });
 *
 * // Позже, когда подписка больше не нужна:
 * unsubscribe();
 */
export function onServiceWorkerMessage(
    messageType: string,
    handler: (event: MessageEvent) => void
): () => void {
    if (!('serviceWorker' in navigator)) {
        return () => {};
    }

    const listener = (event: MessageEvent): void => {
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
    };

    navigator.serviceWorker.addEventListener('message', listener);

    return () => {
        navigator.serviceWorker.removeEventListener('message', listener);
    };
}

