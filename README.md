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
