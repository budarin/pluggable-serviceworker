# @budarin/pluggable-serviceworker

🔌 Расширяемый через плагины Service Worker

Библиотека для создания модульных и расширяемых Service Worker'ов с помощью системы плагинов. Позволяет легко добавлять функциональность через плагины с поддержкой приоритетов и обработки ошибок.

## ✨ Особенности

- 🔌 **Система плагинов** - модульная архитектура для расширения функциональности
- 📊 **Порядок выполнения** - предсказуемый контроль порядка выполнения плагинов
- 🛡️ **Обработка ошибок** - централизованная обработка ошибок
- 📝 **Логирование** - настраиваемое логирование с поддержкой различных уровней
- 🎯 **TypeScript** - полная поддержка типов
- 🚀 **Простота использования** - минимальная настройка

## 📦 Установка

```bash
npm install @budarin/pluggable-serviceworker
```

или

```bash
pnpm add @budarin/pluggable-serviceworker
```

## 🚀 Быстрый старт

### Базовое использование

```typescript
// sw.js
import { initializeServiceWorker } from '@budarin/pluggable-serviceworker';

// Простой плагин для кеширования
const cachePlugin = {
    name: 'cache-plugin',

    install: async (event) => {
        const cache = await caches.open('my-cache-v1');
        await cache.addAll(['/', '/styles.css', '/script.js']);
    },

    fetch: async (event) => {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || fetch(event.request);
    },
};

// Инициализация Service Worker с плагинами
initializeServiceWorker([cachePlugin], { logger: console });
```

### Использование с порядком выполнения

```typescript
import { initializeServiceWorker } from '@budarin/pluggable-serviceworker';

const authPlugin = {
    name: 'auth-plugin',
    // Без order - выполняется первым (в порядке добавления)

    fetch: async (event) => {
        // Проверка авторизации для API запросов
        if (event.request.url.includes('/api/')) {
            const token = await getAuthToken();
            if (!token) {
                return new Response('Unauthorized', { status: 401 });
            }
        }
        return undefined; // Передать обработку следующему плагину
    },
};

const loggingPlugin = {
    name: 'logging-plugin',
    // Без order - выполняется вторым (в порядке добавления)

    fetch: async (event) => {
        console.log('Запрос:', event.request.url);
        return undefined;
    },
};

const cachePlugin = {
    name: 'cache-plugin',
    order: 1, // Выполняется после плагинов без order

    fetch: async (event) => {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || fetch(event.request);
    },
};

const fallbackPlugin = {
    name: 'fallback-plugin',
    order: 2, // Выполняется последним

    fetch: async (event) => {
        // Возвращаем fallback страницу для навигационных запросов
        if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
        return undefined;
    },
};

initializeServiceWorker([
    authPlugin,
    loggingPlugin,
    cachePlugin,
    fallbackPlugin,
]);
```

### Обработка ошибок

Библиотека предоставляет единый обработчик для всех типов ошибок в Service Worker:

```typescript
import {
    initializeServiceWorker,
    ServiceWorkerErrorType,
} from '@budarin/pluggable-serviceworker';

const config = {
    logger: {
        info: (...data) => console.log('[SW INFO]', ...data),
        warn: (...data) => console.warn('[SW WARN]', ...data),
        error: (...data) => console.error('[SW ERROR]', ...data),
        debug: (...data) => console.debug('[SW DEBUG]', ...data),
    },
    onError: (error, event, errorType) => {
        console.log(`Ошибка типа "${errorType}":`, error);

        switch (errorType) {
            case ServiceWorkerErrorType.ERROR:
                // JavaScript ошибки
                console.error('JavaScript error:', error);
                break;

            case ServiceWorkerErrorType.MESSAGE_ERROR:
                // Ошибки сообщений
                console.error('Message error:', error);
                break;

            case ServiceWorkerErrorType.UNHANDLED_REJECTION:
                // Необработанные Promise rejection
                console.error('Unhandled promise rejection:', error);
                break;

            case ServiceWorkerErrorType.REJECTION_HANDLED:
                // Обработанные Promise rejection
                console.log('Promise rejection handled:', error);
                break;

            case ServiceWorkerErrorType.PLUGIN_ERROR:
                // Ошибки в плагинах
                console.error('Plugin error:', error);
                break;

            default:
                // Неизвестные типы ошибок
                console.error('Unknown error type:', error);

                // Отправка ошибки в аналитику
                fetch('/api/errors', {
                    method: 'POST',
                    body: JSON.stringify({
                        error: error.message,
                        eventType: event.type,
                        url: event.request?.url,
                        timestamp: Date.now(),
                    }),
                }).catch(() => {
                    // Игнорируем ошибки отправки логов
                });
        }
    },
};

initializeServiceWorker(
    [
        /* ваши плагины */
    ],
    config
);
```

### Логирование

Библиотека поддерживает настраиваемое логирование через параметр `logger`:

```typescript
import { initializeServiceWorker } from '@budarin/pluggable-serviceworker';

// Простой logger с префиксами
const logger = {
    info: (...data) => console.log('[SW INFO]', ...data),
    warn: (...data) => console.warn('[SW WARN]', ...data),
    error: (...data) => console.error('[SW ERROR]', ...data),
    debug: (...data) => console.debug('[SW DEBUG]', ...data),
};

// Logger с отправкой в аналитику
const analyticsLogger = {
    info: (...data) => {
        console.log('[SW INFO]', ...data);
        // Отправка в аналитику для важных событий
    },
    warn: (...data) => {
        console.warn('[SW WARN]', ...data);
        sendToAnalytics('warning', data);
    },
    error: (...data) => {
        console.error('[SW ERROR]', ...data);
        sendToAnalytics('error', data);
    },
    debug: (...data) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[SW DEBUG]', ...data);
        }
    },
};

const config = {
    logger: analyticsLogger,
    onError: (error, event, errorType) => {
        // Обработка ошибок
    },
};

initializeServiceWorker(
    [
        /* плагины */
    ],
    config
);
```

Logger используется внутри библиотеки для логирования ошибок в обработчиках ошибок, что предотвращает бесконечные циклы при ошибках в самих обработчиках ошибок.

#### Типы ошибок

Используйте enum `ServiceWorkerErrorType` для типизированной обработки ошибок:

- _`ServiceWorkerErrorType.ERROR`_ - JavaScript ошибки (ErrorEvent)
- _`ServiceWorkerErrorType.MESSAGE_ERROR`_ - Ошибки при обработке сообщений (MessageEvent)
- _`ServiceWorkerErrorType.UNHANDLED_REJECTION`_ - Необработанные Promise rejection
- _`ServiceWorkerErrorType.REJECTION_HANDLED`_ - Обработанные Promise rejection
- _`ServiceWorkerErrorType.PLUGIN_ERROR`_ - Ошибки в плагинах

## 🔧 API

### SwMessageEvent

Типизированный интерфейс для событий сообщений Service Worker:

```typescript
interface SwMessageEvent extends Omit<ExtendableMessageEvent, 'data'> {
    data: {
        type: string;
    };
}
```

### ServiceWorkerErrorType

Перечисление типов ошибок Service Worker:

```typescript
enum ServiceWorkerErrorType {
    ERROR = 'error', // JavaScript ошибки
    MESSAGE_ERROR = 'messageerror', // Ошибки сообщений
    UNHANDLED_REJECTION = 'unhandledrejection', // Необработанные Promise rejection
    REJECTION_HANDLED = 'rejectionhandled', // Обработанные Promise rejection
    PLUGIN_ERROR = 'plugin_error', // Ошибки в плагинах
}
```

### FetchResponse

Тип для ответов fetch обработчиков:

```typescript
type FetchResponse = Promise<Response | undefined>;
```

### ServiceWorkerPlugin

Интерфейс плагина:

```typescript
interface ServiceWorkerPlugin {
    name: string; // Уникальное имя плагина
    order?: number; // Порядок выполнения (плагины без order выполняются первыми)
    install?: (event: ExtendableEvent) => void | Promise<void>;
    activate?: (event: ExtendableEvent) => void | Promise<void>;
    fetch?: (event: FetchEvent) => Promise<Response | undefined>;
    message?: (event: SwMessageEvent) => void;
    sync?: (event: SyncEvent) => void | Promise<void>; // Фоновая синхронизация
    periodicsync?: (event: PeriodicSyncEvent) => void | Promise<void>; // Периодическая синхронизация
    push?: (event: PushEvent) => void | Promise<void>; // Может быть асинхронным
}
```

### createEventHandlers

Функция для создания обработчиков событий (экспортируется для продвинутого использования):

```typescript
function createEventHandlers(
    plugins: ServiceWorkerPlugin[],
    config: ServiceWorkerConfig = {}
): {
    install: (event: ExtendableEvent) => void;
    activate: (event: ExtendableEvent) => void;
    fetch: (event: FetchEvent) => void;
    message: (event: SwMessageEvent) => void;
    sync: (event: SyncEvent) => void;
    periodicsync: (event: PeriodicSyncEvent) => void;
    push: (event: PushEvent) => void;
    error: (event: ErrorEvent) => void;
    messageerror: (event: MessageEvent) => void;
    unhandledrejection: (event: PromiseRejectionEvent) => void;
    rejectionhandled: (event: PromiseRejectionEvent) => void;
};
```

### initializeServiceWorker

Основная функция для инициализации Service Worker:

```typescript
function initializeServiceWorker(
    plugins: ServiceWorkerPlugin[],
    config?: ServiceWorkerConfig
): void;
```

### Logger

Интерфейс для логирования:

```typescript
interface Logger {
    info: (...data: unknown[]) => void;
    warn: (...data: unknown[]) => void;
    error: (...data: unknown[]) => void;
    debug: (...data: unknown[]) => void;
}
```

### ServiceWorkerConfig

Конфигурация Service Worker:

```typescript
interface ServiceWorkerConfig {
    logger?: Logger;
    onError?: (
        error: Error | any,
        event: Event,
        errorType?: ServiceWorkerErrorType
    ) => void;
}
```

## 📝 Примеры плагинов

### Плагин кеширования

```typescript
const cachePlugin = {
    name: 'advanced-cache',
    order: 1,

    install: async (event) => {
        const cache = await caches.open('app-cache-v1');
        await cache.addAll([
            '/',
            '/offline.html',
            '/assets/app.css',
            '/assets/app.js',
        ]);
    },

    fetch: async (event) => {
        // Стратегия "Cache First" для статических ресурсов
        if (event.request.url.includes('/assets/')) {
            const cachedResponse = await caches.match(event.request);
            return cachedResponse || fetch(event.request);
        }

        // Стратегия "Network First" для API
        if (event.request.url.includes('/api/')) {
            try {
                const response = await fetch(event.request);
                const cache = await caches.open('api-cache-v1');
                cache.put(event.request, response.clone());
                return response;
            } catch (error) {
                return caches.match(event.request);
            }
        }

        return undefined;
    },
};
```

### Плагин уведомлений

```typescript
const notificationPlugin = {
    name: 'notifications',

    push: async (event) => {
        const data = event.data?.json() || {};

        const options = {
            body: data.body || 'Новое уведомление',
            icon: data.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: data.tag || 'default',
            data: data.url ? { url: data.url } : undefined,
        };

        await self.registration.showNotification(
            data.title || 'Уведомление',
            options
        );
    },

    message: (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
            // Обработка клика по уведомлению
            clients.openWindow(event.data.url);
        }
    },
};
```

### Плагин фоновой синхронизации

```typescript
const backgroundSyncPlugin = {
    name: 'background-sync',

    sync: async (event) => {
        // Тег 'sync-data' регистрируется через:
        // await self.registration.sync.register('sync-data');
        if (event.tag === 'sync-data') {
            await doBackgroundSync();
        }
    },

    periodicsync: async (event) => {
        // Тег 'content-sync' регистрируется через:
        // await self.registration.periodicSync.register('content-sync', { minInterval: 24 * 60 * 60 * 1000 });
        if (event.tag === 'content-sync') {
            await doPeriodicSync();
        }
    },
};

async function doBackgroundSync() {
    // Получение отложенных задач из IndexedDB
    const tasks = await getPendingTasks();

    for (const task of tasks) {
        try {
            await fetch(task.url, {
                method: task.method,
                body: task.body,
                headers: task.headers,
            });

            await removeTask(task.id);
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }
}

async function doPeriodicSync() {
    // Периодическая синхронизация данных
    try {
        const response = await fetch('/api/sync');
        const data = await response.json();

        // Сохранение данных в кеш или IndexedDB
        await updateLocalData(data);

        console.log('Периодическая синхронизация завершена');
    } catch (error) {
        console.error('Ошибка периодической синхронизации:', error);
    }
}
```

## 🎯 Порядок выполнения

Плагины выполняются в следующем порядке:

1. **Сначала ВСЕ плагины без `order`** - в том порядке, в котором они были добавлены
2. **Затем плагины с `order`** - в порядке возрастания значений `order`

### Пример:

```typescript
const plugins = [
    { name: 'first' }, // без order - выполняется первым
    { name: 'fourth', order: 2 },
    { name: 'second' }, // без order - выполняется вторым
    { name: 'third', order: 1 },
    { name: 'fifth' }, // без order - выполняется третьим
];

// Порядок выполнения: first → second → fifth → third → fourth
```

**Преимущества новой системы:**

- 🎯 **Предсказуемость** - плагины без `order` всегда выполняются первыми
- 🔧 **Простота** - не нужно знать, какие номера уже заняты
- 📈 **Масштабируемость** - легко добавлять новые плагины в нужном порядке

## ⚡ Логика выполнения обработчиков

Разные типы событий Service Worker обрабатываются по-разному в зависимости от их специфики:

### 🔄 Параллельное выполнение

**События:** `install`, `activate`, `message`, `sync`, `periodicsync`

Все обработчики выполняются **одновременно** с помощью `Promise.all()`:

```typescript
// Все плагины инициализируются параллельно
const installPlugin1 = {
    name: 'cache',
    install: async () => {
        /* кеширование */
    },
};
const installPlugin2 = {
    name: 'db',
    install: async () => {
        /* инициализация БД */
    },
};

// Оба install обработчика выполнятся одновременно
```

**Почему параллельно:**

- **install/activate**: Все плагины должны инициализироваться независимо
- **message**: Все плагины должны получить сообщение одновременно
- **sync**: Разные задачи синхронизации независимы (синхронизация данных + кеша)
- **periodicsync**: Периодические задачи независимы друг от друга

### ➡️ Последовательное выполнение

**События:** `fetch`, `push`

Обработчики выполняются **по очереди** до первого успешного результата:

#### Fetch - с прерыванием цепочки

```typescript
const authPlugin = {
    name: 'auth',
    // Без order - выполняется первым
    fetch: async (event) => {
        if (needsAuth(event.request)) {
            return new Response('Unauthorized', { status: 401 }); // Прерывает цепочку
        }
        return undefined; // Передает следующему плагину
    },
};

const cachePlugin = {
    name: 'cache',
    order: 1, // Выполняется после плагинов без order
    fetch: async (event) => {
        return await caches.match(event.request); // Может вернуть Response или null
    },
};

// Выполнение: auth (без order) → cache (order: 1) → fetch(event.request) если все вернули null
```

#### Push - без прерывания

```typescript
const notificationPlugin = {
    name: 'notifications',
    push: async (event) => {
        await self.registration.showNotification('Уведомление');
        // Не прерывает выполнение других плагинов
    },
};

const analyticsPlugin = {
    name: 'analytics',
    push: async (event) => {
        await sendPushAnalytics(event.data);
        // Выполнится после notifications
    },
};

// Все push обработчики выполнятся последовательно
```

**Почему последовательно:**

- **fetch**: Нужен только один ответ, первый успешный прерывает цепочку
- **push**: Избегает конфликтов уведомлений, но все плагины должны обработать событие

### 📋 Сводная таблица

| Событие        | Выполнение      | Прерывание | Причина                          |
| -------------- | --------------- | ---------- | -------------------------------- |
| `install`      | Параллельно     | Нет        | Независимая инициализация        |
| `activate`     | Параллельно     | Нет        | Независимая активация            |
| `fetch`        | Последовательно | Да         | Нужен один ответ                 |
| `message`      | Параллельно     | Нет        | Все получают сообщение           |
| `sync`         | Параллельно     | Нет        | Независимые задачи               |
| `periodicsync` | Параллельно     | Нет        | Независимые периодические задачи |
| `push`         | Последовательно | Нет        | Избегание конфликтов             |

## 🛡️ Обработка ошибок

- **Единый обработчик** - все типы ошибок обрабатываются через `config.onError`
- **Типизированные ошибки** - третий параметр `errorType` указывает тип ошибки
- **Глобальные события** - автоматическая обработка `error`, `messageerror`, `unhandledrejection`, `rejectionhandled`
- **Изоляция ошибок** - ошибка в одном плагине не останавливает выполнение других
- **Безопасность** - ошибки в самих обработчиках ошибок логируются в консоль

## 📄 Лицензия

MIT © Vadim Budarin
