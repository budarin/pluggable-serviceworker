# Клиент: Доступность и ping

[English](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/health/README.md)

Утилиты для проверки поддержки Service Worker и «пинга» SW (пробуждение при усыплении, проверка доступности обработчика fetch).

## Экспорты

| Имя | Описание |
|-----|----------|
| `isServiceWorkerSupported` | Проверка поддержки Service Worker в текущем окружении. |
| `pingServiceWorker` | GET-запрос по пути `/sw-ping` (обрабатывается плагином ping библиотеки). Будит SW, проверяет fetch. |
| `PingServiceWorkerResult` | Тип результата: `'ok' \| 'no-sw' \| 'error'`. |
| `PingServiceWorkerOptions` | Тип опций для `pingServiceWorker`. |

## API

### `isServiceWorkerSupported()`

Возвращает, доступен ли Service Worker (есть `navigator` и `'serviceWorker' in navigator`). Используйте перед вызовом других клиентских утилит, если код может выполняться при SSR, в тестах или в старых браузерах.

- **Возвращает:** `boolean`.

### `pingServiceWorker(options?)`

Выполняет GET-запрос по пути ping (по умолчанию `/sw-ping`). Внутренний плагин ping в SW отвечает 204 без выхода в сеть. Это будит SW, если он был «усыплён», и подтверждает, что обработчик fetch работает.

- **`options`** — опционально `PingServiceWorkerOptions`:
  - **`timeoutMs?: number`** — таймаут запроса в мс (по умолчанию `3000`).
  - **`path?: string`** — путь для ping (по умолчанию `'/sw-ping'`; при переопределении должен совпадать с `pingPath` в `initServiceWorker`).
- **Возвращает:** `Promise<PingServiceWorkerResult>`:
  - **`'ok'`** — SW поддерживается и ответ 2xx/3xx.
  - **`'no-sw'`** — Service Worker не поддерживается.
  - **`'error'`** — ошибка запроса или таймаут.

## Примеры использования

**Импорт из подпути:**

```typescript
import {
    isServiceWorkerSupported,
    pingServiceWorker,
} from '@budarin/pluggable-serviceworker/client/health';
```

**Пример: проверка и ping**

```typescript
if (!isServiceWorkerSupported()) {
    return;
}

const result = await pingServiceWorker();
if (result === 'ok') {
    console.log('SW доступен');
} else if (result === 'error') {
    console.warn('Ping SW не удался или таймаут');
}
```

**Пример: пробуждение SW при фокусе (например после сна устройства)**

```typescript
import { pingServiceWorker } from '@budarin/pluggable-serviceworker/client/health';

window.addEventListener('focus', () => {
    void pingServiceWorker();
});
```

**Пример: свой путь для ping**

```typescript
const result = await pingServiceWorker({
    path: '/internal/sw-ping',
    timeoutMs: 5000,
});
```
