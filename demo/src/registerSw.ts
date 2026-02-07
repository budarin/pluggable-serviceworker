import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants';

/** В dev SW не регистрируется; демо с SW только после build + preview. */
export function registerSw(): Promise<ServiceWorkerRegistration | undefined> {
    if (!('serviceWorker' in navigator)) return Promise.resolve(undefined);
    if (import.meta.env.DEV) return Promise.resolve(undefined);

    return navigator.serviceWorker
        .register('/sw.js', { type: 'module' })
        .then((reg) => {
            console.info('SW зарегистрирован:', reg.scope);
            return reg;
        })
        .catch((err) => {
            console.error('Ошибка регистрации SW:', err);
            return undefined;
        });
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
