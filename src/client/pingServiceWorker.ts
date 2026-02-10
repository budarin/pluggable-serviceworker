import { isServiceWorkerSupported } from './isServiceWorkerSupported.js';
import { SW_PING_PATH } from '../constants/paths.js';

export type PingServiceWorkerResult = 'ok' | 'no-sw' | 'error';

export interface PingServiceWorkerOptions {
    /** Таймаут ожидания ответа, мс (по умолчанию 3000). */
    timeoutMs?: number;
    /** Путь ping-запроса (по умолчанию SW_PING_PATH, т.е. '/sw-ping'). */
    path?: string;
}

/**
 * Выполняет ping-запрос к Service Worker по пути `/sw-ping`.
 *
 * Запрос `GET /sw-ping` будит SW (если он был "усыплён") и проверяет базовую
 * доступность обработчика fetch. Плагин `ping` в сервис-воркере отвечает 204
 * без похода на бэкенд.
 *
 * Возвращает:
 * - 'ok'    — SW поддерживается и ответ пришёл (статус 2xx/3xx);
 * - 'no-sw' — SW не поддерживается в текущем окружении;
 * - 'error' — ошибка запроса или таймаут.
 */
export async function pingServiceWorker(
    options: PingServiceWorkerOptions = {}
): Promise<PingServiceWorkerResult> {
    if (!isServiceWorkerSupported()) {
        return 'no-sw';
    }

    const { timeoutMs = 3000, path = SW_PING_PATH } = options;

    try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);

        const resp = await fetch(path, {
            method: 'GET',
            signal: ac.signal,
        });

        clearTimeout(timer);

        return resp.ok ? 'ok' : 'error';
    } catch {
        return 'error';
    }
}

