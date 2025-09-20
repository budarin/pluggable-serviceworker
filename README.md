# @vadimbudarin/pluggable-serviceworker

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
npm install @vadimbudarin/pluggable-serviceworker
```

или

```bash
pnpm add @vadimbudarin/pluggable-serviceworker
```

## 🚀 Быстрый старт

### Базовое использование

```typescript
// sw.js
import { initializeServiceWorker } from '@vadimbudarin/pluggable-serviceworker';

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
import { initializeServiceWorker } from '@vadimbudarin/pluggable-serviceworker';

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

```typescript
import { initializeServiceWorker } from '@vadimbudarin/pluggable-serviceworker';

const config = {
    onError: (error, event) => {
        console.error('Ошибка в Service Worker:', error);

        // Отправка ошибки в аналитику
        if ('fetch' in event) {
            fetch('/api/errors', {
                method: 'POST',
                body: JSON.stringify({
                    error: error.message,
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
    sync?: (event: SyncEvent) => void;
    push?: (event: PushEvent) => void;
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
    onError?: (error: Error, event: Event) => void;
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

    push: (event) => {
        const data = event.data?.json() || {};

        const options = {
            body: data.body || 'Новое уведомление',
            icon: data.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: data.tag || 'default',
            data: data.url ? { url: data.url } : undefined,
        };

        self.registration.showNotification(
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

    sync: (event) => {
        if (event.tag === 'background-sync') {
            event.waitUntil(doBackgroundSync());
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

## 🛡️ Обработка ошибок

- Ошибки в плагинах автоматически перехватываются
- Можно настроить кастомный обработчик через `config.onError`
- Ошибка в одном плагине не останавливает выполнение других

## 📄 Лицензия

MIT © Vadim Budarin
