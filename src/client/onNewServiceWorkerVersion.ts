/**
 * Подписка на появление новой версии Service Worker.
 *
 * Варианты использования:
 * 1) После регистрации:
 *    const reg = await registerServiceWorkerWithClaimWorkaround('/sw.js');
 *    onNewServiceWorkerVersion(reg, () => { ... показать баннер ... });
 *
 * 2) Без явной регистрации (если SW уже установлен):
 *    onNewServiceWorkerVersion((reg) => { ... });
 *
 * Колбэк вызывается, когда браузер скачал новую версию SW, она перешла
 * в состояние "installed", и при этом у страницы уже есть контроллер
 * (navigator.serviceWorker.controller !== null). То есть это именно
 * "доступна новая версия", а не первый install.
 */
export function onNewServiceWorkerVersion(
    registration: ServiceWorkerRegistration | undefined,
    onUpdate: (registration: ServiceWorkerRegistration) => void
): void;
export function onNewServiceWorkerVersion(
    onUpdate: (registration: ServiceWorkerRegistration) => void
): void;
export function onNewServiceWorkerVersion(
    registrationOrOnUpdate:
        | ServiceWorkerRegistration
        | undefined
        | ((registration: ServiceWorkerRegistration) => void),
    maybeOnUpdate?: (registration: ServiceWorkerRegistration) => void
): void {
    if (typeof registrationOrOnUpdate === 'function') {
        const onUpdate = registrationOrOnUpdate;

        if (!('serviceWorker' in navigator)) {
            return;
        }

        void navigator.serviceWorker.ready.then((reg) => {
            attachUpdateListener(reg, onUpdate);
        });

        return;
    }

    const registration = registrationOrOnUpdate;
    const onUpdate = maybeOnUpdate;

    if (!registration || !onUpdate) {
        return;
    }
    if (!('serviceWorker' in navigator)) {
        return;
    }

    attachUpdateListener(registration, onUpdate);
}

function attachUpdateListener(
    registration: ServiceWorkerRegistration,
    onUpdate: (registration: ServiceWorkerRegistration) => void
): void {
    registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) {
            return;
        }

        installing.addEventListener('statechange', () => {
            if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller != null
            ) {
                onUpdate(registration);
            }
        });
    });
}

