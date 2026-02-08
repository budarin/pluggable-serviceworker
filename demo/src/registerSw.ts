import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

export async function registerSw(): Promise<
    ServiceWorkerRegistration | undefined
> {
    if (!('serviceWorker' in navigator)) return Promise.resolve(undefined);

    try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
            type: 'module',
        });
        return reg;
    } catch (err) {
        console.error('Ошибка регистрации SW:', err);
        return undefined;
    }
}

/** Отправить сигнал ожидающему SW: skipWaiting + claim. Вызывать, когда есть reg.waiting. */
export function sendActivateSignal(
    reg: ServiceWorkerRegistration | undefined
): void {
    if (!reg?.waiting) {
        console.warn('Нет ожидающего обновления (reg.waiting)');
        return;
    }
    reg.waiting.postMessage({ type: SW_MSG_SKIP_WAITING });
}
