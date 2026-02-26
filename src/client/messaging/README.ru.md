# Клиент: Сообщения

[English](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/messaging/README.md)

Утилиты для отправки сообщений в Service Worker и подписки на сообщения **по типу**. Включает запрос версии, работающий с внутренним плагином библиотеки (настройка SW не требуется).

---

## Экспорты

| Имя | Описание |
|-----|----------|
| `onServiceWorkerMessage` | Подписка на сообщения от SW с заданным `data.type`. Возвращает функцию отписки. |
| `postMessageToServiceWorker` | Отправка сообщения в активный Service Worker. |
| `sendSkipWaitingSignal` | Отправка сигнала skip-waiting **ожидающему** SW (активация по сигналу). |
| `getServiceWorkerVersion` | Запрос версии активного SW (из опций `initServiceWorker`). |
| `PostMessageToServiceWorkerOptions` | Тип опций для `postMessageToServiceWorker`. |
| `GetServiceWorkerVersionOptions` | Тип опций для `getServiceWorkerVersion`. |

---

## Формат сообщений

Библиотека ожидает сообщения в виде **объектов с полем `type`** (строка). SW отправляет, например, `{ type: 'MY_TYPE', ...payload }`. Обработчик на клиенте получает стандартный `MessageEvent`; `event.data` — этот объект. `onServiceWorkerMessage(messageType, handler)` вызывает `handler` только когда `event.data.type === messageType`, поэтому можно иметь несколько подписок на разные типы.

---

## 1. `onServiceWorkerMessage(messageType, handler)`

Подписывается на сообщения от Service Worker, у которых `event.data.type === messageType`. Все остальные сообщения игнорируются. Используйте для баннеров «доступна новая версия», уведомлений об обновлении кэша или любого своего протокола SW→клиент.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `messageType` | `string` | Точное значение типа для прослушивания (например `'SW_MSG_NEW_VERSION_READY'`). |
| `handler` | `(event: MessageEvent) => void` | Вызывается при получении сообщения с этим типом. |

- **Возвращает:** `() => void` — вызов для отписки (удаляет слушатель). Если Service Worker не поддерживается, возвращается пустая функция.

**Поведение:**

- Слушатель вешается на `navigator.serviceWorker` (все сообщения от SW).
- Обработчик вызывается только для сообщений, у которых `event.data` — объект с `data.type === messageType`.
- Можно вызывать `onServiceWorkerMessage` несколько раз для разных типов; подписки независимы.

**Пример — подписка и чтение payload:**

```typescript
import { onServiceWorkerMessage } from '@budarin/pluggable-serviceworker/client/messaging';

const unsubscribe = onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', (event) => {
    const data = event.data as { type: string; version?: string };
    console.log('Новая версия готова', data.version);
    showReloadBanner();
});

// Когда компонент размонтирован или подписка не нужна:
unsubscribe();
```

**Пример — несколько типов сообщений:**

```typescript
const unsub1 = onServiceWorkerMessage('CACHE_UPDATED', (event) => {
    const data = event.data as { type: string; urls?: string[] };
    console.log('Кэш обновлён', data.urls);
});

const unsub2 = onServiceWorkerMessage('SYNC_FAILED', (event) => {
    const data = event.data as { type: string; reason?: string };
    reportError(data.reason);
});

// Очистка:
unsub1();
unsub2();
```

---

## 2. `postMessageToServiceWorker(message, options?)`

Отправляет **сериализуемое** сообщение в активный Service Worker (либо `navigator.serviceWorker.controller`, либо `registration.active`, если контроллера ещё нет, но регистрация уже в состоянии ready).

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `message` | `unknown` | Любое [structured-cloneable](https://developer.mozilla.org/ru/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) значение (например `{ type: 'PING', id: 1 }`). |
| `options` | `PostMessageToServiceWorkerOptions` (опционально) | См. ниже. |

**`PostMessageToServiceWorkerOptions`:**

| Свойство | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `waitForReady` | `boolean` | `true` | Если контроллера ещё нет: при `true` ждёт `navigator.serviceWorker.ready` и отправляет через `registration.active`, если есть; при `false` сразу возвращает `false`. |

- **Возвращает:** `Promise<boolean>` — `true`, если сообщение отправлено (найден controller или active), `false` если Service Worker не поддерживается или нет активного воркера (и при `waitForReady === false` — если контроллера ещё нет).

**Пример — отправить и проверить:**

```typescript
import { postMessageToServiceWorker } from '@budarin/pluggable-serviceworker/client/messaging';

const payload = { type: 'MY_MSG_PING', timestamp: Date.now() };
const sent = await postMessageToServiceWorker(payload);
if (!sent) {
    console.warn('Service Worker не готов или не поддерживается');
}
```

**Пример — не ждать ready (быстро получить false при отсутствии контроллера):**

```typescript
const sent = await postMessageToServiceWorker(
    { type: 'PING' },
    { waitForReady: false }
);
if (!sent) {
    console.log('Контроллера ещё нет, пропустить или повторить позже');
}
```

**Пример — свой протокол (SW должен обрабатывать тип в своём плагине `message`):**

```typescript
await postMessageToServiceWorker({
    type: 'FETCH_PREVIEW',
    url: '/api/preview',
    id: 'preview-1',
});
```

---

## 3. `sendSkipWaitingSignal()`

Отправляет сигнал skip-waiting **ожидающему** Service Worker (тому, что ждёт активации), а не активному. Используйте, когда SW использует `skipWaitingOnMessage` и вы хотите активировать новую версию по действию пользователя (кнопка «Обновить»). **Не** используйте для этого `postMessageToServiceWorker` — он шлёт в активный SW, который не может вызвать `skipWaiting()` за ожидающий.

Параметров нет. Использует `navigator.serviceWorker.ready` и шлёт в `registration.waiting`, если он есть.

- **Возвращает:** `Promise<boolean>` — `true`, если сообщение отправлено ожидающему воркеру, `false` если SW не поддерживается, регистрация не готова или нет ожидающего воркера.

Если после вызова активация не происходит, обработчик сообщений у ожидающего воркера может ещё не быть готов (например, сразу после install). Вызывайте `sendSkipWaitingSignal()` когда приложение уже знает об ожидающем воркере (например, после появления `registration.waiting` в обработчике `updatefound`) или повторите вызов с небольшой задержкой.

**Пример — кнопка «Обновить» при появлении новой версии:**

```typescript
import { sendSkipWaitingSignal } from '@budarin/pluggable-serviceworker/client/messaging';

async function onUpdateClick() {
    const sent = await sendSkipWaitingSignal();
    if (!sent) {
        console.warn('Нет ожидающего воркера (или SW не поддерживается)');
    }
    // После skipWaiting сработает controllerchange; можно перезагрузить страницу.
}
```

---

## 4. `getServiceWorkerVersion(options?)`

Запрашивает **строку версии** у активного Service Worker (значение `version`, переданное в `initServiceWorker`). Использует внутренний протокол библиотеки: отправляет `{ type: PLUGGABLE_SW_GET_VERSION }` и ждёт `{ type: PLUGGABLE_SW_VERSION, version: string }`. Дополнительный код в SW не нужен.

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `options` | `GetServiceWorkerVersionOptions` (опционально) | См. ниже. |

**`GetServiceWorkerVersionOptions`:**

| Свойство | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `timeoutMs` | `number` | `5000` | Максимальное время ожидания ответа с версией, мс. |

- **Возвращает:** `Promise<string | null>` — строка версии или `null`, если:
  - Service Worker не поддерживается, или
  - Нет активного воркера (сообщение не отправлено), или
  - Ответ не пришёл за `timeoutMs`.

**Пример — показать версию в UI:**

```typescript
import { getServiceWorkerVersion } from '@budarin/pluggable-serviceworker/client/messaging';

const version = await getServiceWorkerVersion({ timeoutMs: 3000 });
if (version != null) {
    document.getElementById('sw-version').textContent = version;
} else {
    console.warn('Не удалось получить версию SW (не поддерживается, нет воркера или таймаут)');
}
```

**Пример — таймаут по умолчанию (5 с):**

```typescript
const version = await getServiceWorkerVersion();
console.log('Версия SW:', version ?? 'неизвестно');
```

---

## Полный пример (все методы)

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    sendSkipWaitingSignal,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/messaging';

// 1) Подписка на сообщения SW по типу
const unsubscribe = onServiceWorkerMessage('SW_MSG_NEW_VERSION_READY', (event) => {
    const data = event.data as { type: string; version?: string };
    showBanner('Новая версия ' + (data.version ?? '') + ' — перезагрузите страницу');
});

// 2) Отправка своего сообщения в активный SW
const sent = await postMessageToServiceWorker({ type: 'PING', id: 1 });
if (!sent) console.warn('Сообщение не отправлено');

// 3) Сигнал ожидающему SW активироваться (используйте sendSkipWaitingSignal, не postMessageToServiceWorker)
await sendSkipWaitingSignal();

// 4) Получение версии SW (протокол библиотеки)
const version = await getServiceWorkerVersion({ timeoutMs: 5000 });
console.log('Версия Service Worker:', version ?? 'н/д');

// 5) Отписка при необходимости
unsubscribe();
```

---

## Импорт

**Подпуть (меньший бандл):**

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    sendSkipWaitingSignal,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/messaging';
```

**Основной клиентский вход:**

```typescript
import {
    onServiceWorkerMessage,
    postMessageToServiceWorker,
    sendSkipWaitingSignal,
    getServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client';
```
