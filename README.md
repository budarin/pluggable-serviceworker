# @budarin/pluggable-serviceworker

🔌 Расширяемый через плагины Service Worker

Библиотека для создания модульных и расширяемых Service Worker'ов с помощью системы плагинов. Позволяет легко добавлять функциональность через плагины с поддержкой приоритетов и обработки ошибок.

## ✨ Особенности

- 🔌 **Система плагинов** - модульная архитектура для расширения функциональности
- 📊 **Приоритеты** - контроль порядка выполнения плагинов
- 🛡️ **Обработка ошибок** - централизованная обработка ошибок
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
initializeServiceWorker([cachePlugin]);
```

### Использование с приоритетами

```typescript
import { initializeServiceWorker } from '@budarin/pluggable-serviceworker';

const authPlugin = {
    name: 'auth-plugin',
    priority: 1, // Выполняется первым

    fetch: async (event) => {
        // Проверка авторизации для API запросов
        if (event.request.url.includes('/api/')) {
            const token = await getAuthToken();
            if (!token) {
                return new Response('Unauthorized', { status: 401 });
            }
        }
        return null; // Передать обработку следующему плагину
    },
};

const cachePlugin = {
    name: 'cache-plugin',
    priority: 2, // Выполняется вторым

    fetch: async (event) => {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || fetch(event.request);
    },
};

const loggingPlugin = {
    name: 'logging-plugin',
    // Без приоритета - выполняется последним

    fetch: async (event) => {
        console.log('Запрос:', event.request.url);
        return null;
    },
};

initializeServiceWorker([authPlugin, cachePlugin, loggingPlugin]);
```

### Обработка ошибок

Библиотека предоставляет единый обработчик для всех типов ошибок в Service Worker:

```typescript
import { initializeServiceWorker } from '@budarin/pluggable-serviceworker';

const config = {
    onError: (error, event, errorType) => {
        console.log(`Ошибка типа "${errorType}":`, error);

        switch (errorType) {
            case 'error':
                // JavaScript ошибки
                console.error('JavaScript error:', error);
                break;

            case 'messageerror':
                // Ошибки сообщений
                console.error('Message error:', error);
                break;

            case 'unhandledrejection':
                // Необработанные Promise rejection
                console.error('Unhandled promise rejection:', error);
                break;

            case 'rejectionhandled':
                // Обработанные Promise rejection
                console.log('Promise rejection handled:', error);
                break;

            default:
                // Ошибки в обработчиках событий (fetch, install, etc.)
                console.error('Handler error in', event.type, ':', error);

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

#### Типы ошибок

- **`'error'`** - JavaScript ошибки (ErrorEvent)
- **`'messageerror'`** - Ошибки при обработке сообщений (MessageEvent)
- **`'unhandledrejection'`** - Необработанные Promise rejection
- **`'rejectionhandled'`** - Обработанные Promise rejection
- **`undefined`** - Ошибки в обработчиках событий плагинов (fetch, install, etc.)

## 🔧 API

### ServiceWorkerPlugin

Интерфейс плагина:

```typescript
interface ServiceWorkerPlugin {
    name: string; // Уникальное имя плагина
    priority?: number; // Приоритет выполнения (меньше = раньше)
    install?: (event: ExtendableEvent) => void | Promise<void>;
    activate?: (event: ExtendableEvent) => void | Promise<void>;
    fetch?: (event: FetchEvent) => Promise<Response | null>;
    message?: (event: MessageEvent) => void;
    sync?: (event: SyncEvent) => void | Promise<void>; // Фоновая синхронизация
    periodicsync?: (event: PeriodicSyncEvent) => void | Promise<void>; // Периодическая синхронизация
    push?: (event: PushEvent) => void | Promise<void>; // Может быть асинхронным
}
```

### initializeServiceWorker

Основная функция для инициализации Service Worker:

```typescript
function initializeServiceWorker(
    plugins: ServiceWorkerPlugin[],
    config?: ServiceWorkerConfig
): void;
```

### ServiceWorkerConfig

Конфигурация Service Worker:

```typescript
interface ServiceWorkerConfig {
    plugins?: ServiceWorkerPlugin[];
    onError?: (error: Error | any, event: Event, errorType?: string) => void;
}
```

## 📝 Примеры плагинов

### Плагин кеширования

```typescript
const cachePlugin = {
    name: 'advanced-cache',
    priority: 10,

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

        return null;
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

// Регистрация синхронизации из основного потока (main thread):
//
// // Фоновая синхронизация (одноразовая)
// navigator.serviceWorker.ready.then(registration => {
//     return registration.sync.register('sync-data');
// });
//
// // Периодическая синхронизация (требует разрешения)
// navigator.serviceWorker.ready.then(async registration => {
//     const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
//     if (status.state === 'granted') {
//         await registration.periodicSync.register('content-sync', {
//             minInterval: 24 * 60 * 60 * 1000 // 24 часа
//         });
//     }
// });
```

## 🎯 Порядок выполнения

Плагины выполняются в следующем порядке:

1. **Плагины с приоритетом** - сортируются по возрастанию значения `priority`
2. **Плагины без приоритета** - выполняются в порядке добавления

### Пример:

```typescript
const plugins = [
    { name: 'third', priority: 30 },
    { name: 'first', priority: 10 },
    { name: 'fourth' }, // без приоритета
    { name: 'second', priority: 20 },
    { name: 'fifth' }, // без приоритета
];

// Порядок выполнения: first → second → third → fourth → fifth
```

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
    priority: 1,
    fetch: async (event) => {
        if (needsAuth(event.request)) {
            return new Response('Unauthorized', { status: 401 }); // Прерывает цепочку
        }
        return null; // Передает следующему плагину
    },
};

const cachePlugin = {
    name: 'cache',
    priority: 2,
    fetch: async (event) => {
        return await caches.match(event.request); // Может вернуть Response или null
    },
};

// Выполнение: auth → cache → fetch(event.request) если все вернули null
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
