import { isServiceWorkerSupported } from '../health/isServiceWorkerSupported.js';
import { postMessageToServiceWorker } from './postMessageToServiceWorker.js';
import {
    PLUGGABLE_SW_GET_VERSION,
    PLUGGABLE_SW_VERSION,
} from '../../constants/versionMessages.js';

export interface GetServiceWorkerVersionOptions {
    /** Таймаут ожидания ответа, мс (по умолчанию 5000). */
    timeoutMs?: number;
}

/**
 * Запрашивает у активного Service Worker его версию.
 *
 * Работает в паре с внутренним плагином библиотеки, который отвечает на
 * сообщение `{ type: PLUGGABLE_SW_GET_VERSION }` сообщением
 * `{ type: PLUGGABLE_SW_VERSION, version }`.
 *
 * Возвращает строку с версией или null, если:
 * - SW не поддерживается;
 * - активного воркера нет;
 * - ответ не пришёл в пределах таймаута.
 */
export async function getServiceWorkerVersion(
    options: GetServiceWorkerVersionOptions = {}
): Promise<string | null> {
    if (!isServiceWorkerSupported()) {
        return null;
    }

    const { timeoutMs = 5000 } = options;

    return new Promise<string | null>((resolve) => {
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            navigator.serviceWorker.removeEventListener('message', listener);
            resolve(null);
        }, timeoutMs);

        const listener = (event: MessageEvent): void => {
            const data = event.data as unknown;

            if (
                data == null ||
                typeof data !== 'object' ||
                !('type' in data) ||
                (data as { type: unknown }).type !== PLUGGABLE_SW_VERSION
            ) {
                return;
            }

            const versionValue = (data as { version?: unknown }).version;
            navigator.serviceWorker.removeEventListener('message', listener);
            clearTimeout(timeoutId);

            if (resolved) return;
            resolved = true;

            resolve(typeof versionValue === 'string' ? versionValue : null);
        };

        navigator.serviceWorker.addEventListener('message', listener);

        void postMessageToServiceWorker({ type: PLUGGABLE_SW_GET_VERSION }).then(
            (sent) => {
                if (sent) return;
                if (resolved) return;
                resolved = true;
                navigator.serviceWorker.removeEventListener('message', listener);
                clearTimeout(timeoutId);
                resolve(null);
            }
        );
    });
}
