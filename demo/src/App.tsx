import { useState, useEffect, useRef, JSX } from 'react';
import { sendActivateSignal } from './registerSw';

type SwPhase =
    | 'unsupported'
    | 'not-installed'
    | 'registering'
    | 'installing'
    | 'waiting'
    | 'active'
    | 'update-pending';

interface AppProps {
    registrationPromise: Promise<ServiceWorkerRegistration | undefined>;
}

export function App({ registrationPromise }: AppProps): JSX.Element {
    const [online, setOnline] = useState(navigator.onLine);
    const [phase, setPhase] = useState<SwPhase>('registering');
    const [reg, setReg] = useState<ServiceWorkerRegistration | undefined>();
    const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            setPhase('unsupported');
            return;
        }

        registrationPromise.then((r) => {
            if (!r) {
                setPhase('not-installed');
                return;
            }
            regRef.current = r;
            setReg(r);
            updatePhase(r);
            for (let i = 0; i < 20; i++) {
                setTimeout(() => updatePhase(r), i * 100);
            }
        });

        const onControllerChange = () => {
            const c = navigator.serviceWorker.controller;
            console.log('[SW debug] controllerchange', {
                controllerId: c?.id,
                controllerScript: c?.scriptURL?.slice(-20),
            });
            updatePhase(regRef.current);
        };
        navigator.serviceWorker.addEventListener(
            'controllerchange',
            onControllerChange
        );

        const interval = setInterval(() => {
            if (regRef.current) updatePhase(regRef.current);
        }, 300);

        return () => {
            navigator.serviceWorker.removeEventListener(
                'controllerchange',
                onControllerChange
            );
            clearInterval(interval);
        };
    }, [registrationPromise]);

    // Диагностика SW: появление контроллера, waiting, updatefound
    useEffect(() => {
        if (!reg || !('serviceWorker' in navigator)) return;
        const c = navigator.serviceWorker.controller;
        console.log('[SW debug] registration ready', {
            hasController: !!c,
            controllerId: c?.id,
            activeId: reg.active?.id,
            waitingId: reg.waiting?.id,
            installingId: reg.installing?.id,
        });
        const onUpdateFound = () => {
            const w = reg.installing ?? reg.waiting;
            console.log('[SW debug] updatefound', {
                workerId: w?.id,
                state: w?.state,
            });
        };
        const onWaitingState = () => {
            if (reg.waiting) {
                console.log('[SW debug] waiting worker appeared', {
                    waitingId: reg.waiting.id,
                    hasController: !!navigator.serviceWorker.controller,
                    controllerId: navigator.serviceWorker.controller?.id,
                });
            }
        };
        reg.addEventListener('updatefound', onUpdateFound);
        const checkWaiting = setInterval(() => {
            if (reg.waiting) {
                onWaitingState();
                clearInterval(checkWaiting);
            }
        }, 100);
        setTimeout(() => clearInterval(checkWaiting), 10000);
        return () => {
            reg.removeEventListener('updatefound', onUpdateFound);
            clearInterval(checkWaiting);
        };
    }, [reg]);

    function updatePhase(r: ServiceWorkerRegistration | undefined): void {
        if (!r) return;
        const hasController = !!navigator.serviceWorker.controller;
        const hasActive = r.active != null;
        const waiting = r.waiting != null;
        const installing = r.installing != null;

        if (hasController || hasActive) {
            setPhase(waiting ? 'update-pending' : 'active');
        } else if (waiting) {
            setPhase('waiting');
        } else if (installing) {
            setPhase('installing');
        } else {
            setPhase('registering');
        }
    }

    useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        // После перезагрузки из кеша в офлайне navigator.onLine бывает устаревшим. Запрос к URL не из кеша:
        // офлайн → SW вернёт 503 или fetch отклонится.
        fetch(window.location.origin + '/?__ping=' + Date.now(), {
            cache: 'no-store',
        })
            .then((r) => setOnline(r.status !== 503))
            .catch(() => setOnline(false));

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const hasWaitingWorker = reg?.waiting != null;
    const handleActivate = () => {
        if (!reg?.waiting) return;
        sendActivateSignal(reg);
        // После skipWaiting произойдёт controllerchange и перезагрузка
    };

    return (
        <main style={styles.main}>
            <h1 style={styles.h1}>@budarin/pluggable-serviceworker</h1>
            <p style={styles.p}>
                Демо: пресет <strong>offlineFirst</strong>. При первом запуске
                (нет контроллера) браузер сам активирует SW. Кнопка «Применить»
                появляется, когда есть новая версия в состоянии waiting —
                нажмите «Проверить обновление», чтобы её получить.
            </p>

            <section style={styles.section}>
                <h2 style={styles.h2}>Состояние</h2>
                <ul style={styles.ul}>
                    <li>
                        <strong>Сеть:</strong>{' '}
                        <span style={{ color: online ? 'green' : 'crimson' }}>
                            {online ? 'онлайн' : 'офлайн'}
                        </span>
                    </li>
                    <li>
                        <strong>Service Worker:</strong>{' '}
                        <SwPhaseLabel
                            phase={phase}
                            isDev={import.meta.env.DEV}
                        />
                    </li>
                </ul>
            </section>

            {phase === 'not-installed' && import.meta.env.DEV && (
                <section style={styles.section}>
                    <p style={styles.hint}>
                        В dev SW не регистрируется. Для проверки офлайна и
                        кнопки обновления:{' '}
                        <code>pnpm run build && pnpm run preview</code>.
                    </p>
                </section>
            )}

            {hasWaitingWorker && (
                <section style={styles.section}>
                    <button
                        type="button"
                        onClick={handleActivate}
                        style={{ ...styles.button, ...styles.buttonActive }}
                    >
                        {phase === 'waiting'
                            ? 'Активировать Service Worker'
                            : 'Применить обновление'}
                    </button>
                </section>
            )}

            {phase === 'active' && !reg?.waiting && online && (
                <section style={styles.section}>
                    <button
                        type="button"
                        onClick={() => reg?.update()}
                        style={{ ...styles.button, ...styles.buttonActive }}
                    >
                        Проверить обновление
                    </button>
                    <p style={styles.hint}>
                        Вызовет <code>registration.update()</code>. Если сервер
                        отдаст новый скрипт SW — появится статус «есть
                        обновление» и кнопка «Применить».
                    </p>
                    <h2 style={styles.h2}>Проверка офлайна</h2>
                    <p style={styles.p}>
                        Остановите сервер и обновите страницу — контент должен
                        отдаваться из кеша.
                    </p>
                </section>
            )}
        </main>
    );
}

function SwPhaseLabel({
    phase,
    isDev,
}: {
    phase: SwPhase;
    isDev?: boolean;
}): JSX.Element {
    const labels: Record<SwPhase, string> = {
        unsupported: 'не поддерживается',
        'not-installed': isDev ? 'в dev не регистрируется' : 'не установлен',
        registering: 'регистрация…',
        installing: 'установка…',
        waiting: 'готов к активации',
        active: 'активен',
        'update-pending': 'есть обновление',
    };
    return <span>{labels[phase]}</span>;
}

const styles: Record<string, React.CSSProperties> = {
    main: {
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '42rem',
        margin: '2rem auto',
        padding: '0 1rem',
    },
    h1: {
        fontSize: '1.5rem',
        marginBottom: '0.5rem',
    },
    h2: {
        fontSize: '1.1rem',
        marginBottom: '0.5rem',
    },
    p: {
        color: '#444',
        marginBottom: '0.75rem',
    },
    section: {
        marginBottom: '1.5rem',
    },
    ul: {
        marginBottom: '0.5rem',
    },
    button: {
        padding: '0.5rem 1rem',
        fontSize: '1rem',
    },
    buttonActive: {
        cursor: 'pointer',
    },
    hint: {
        marginTop: '0.5rem',
        fontSize: '0.9rem',
        color: '#666',
    },
};
