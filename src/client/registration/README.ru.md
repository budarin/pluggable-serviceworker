# Клиент: Регистрация

[English](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/registration/README.md)

Утилиты для регистрации Service Worker и подписки на появление новой версии.

## Экспорты

| Имя | Описание |
|-----|----------|
| `registerServiceWorkerWithClaimWorkaround` | Регистрация SW и при необходимости однократная перезагрузка при использовании `claim()` (обход бага браузера). |
| `onNewServiceWorkerVersion` | Подписка на новую версию SW (установлена, есть активный контроллер). Возвращает функцию отписки. |

## API

### `registerServiceWorkerWithClaimWorkaround(scriptURL, options?)`

Регистрирует Service Worker. После `navigator.serviceWorker.ready`, если страница ещё не под контролем (`navigator.serviceWorker.controller === null`), один раз перезагружает страницу. Можно использовать с любым SW; особенно важно, когда в SW в `activate` вызывается `clients.claim()` — обходится [баг браузера](https://issues.chromium.org/issues/482903583).

- **`scriptURL`** — путь к скрипту SW (например `'/sw.js'`).
- **`options`** — опциональные стандартные [RegistrationOptions](https://developer.mozilla.org/ru/docs/Web/API/ServiceWorkerContainer/register#options) (`scope`, `type`).
- **Возвращает:** `Promise<ServiceWorkerRegistration | undefined>`. `undefined`, если Service Worker не поддерживается.

### `onNewServiceWorkerVersion(registration, onUpdate)` / `onNewServiceWorkerVersion(onUpdate)`

Подписка на появление новой версии Service Worker. Колбэк вызывается, когда браузер установил новую версию SW (состояние `installed`) и у страницы уже есть активный контроллер — то есть именно **обновление**, а не первая установка.

**Варианты вызова:**

1. `onNewServiceWorkerVersion(registration, onUpdate)` — когда есть регистрация (например, из `registerServiceWorkerWithClaimWorkaround`).
2. `onNewServiceWorkerVersion(onUpdate)` — когда SW уже зарегистрирован; ждёт `navigator.serviceWorker.ready` и затем подписывается.

- **`registration`** — `ServiceWorkerRegistration | undefined` (только в первом варианте).
- **`onUpdate`** — `(registration: ServiceWorkerRegistration) => void`.
- **Возвращает:** `() => void` — вызов для отписки.

## Примеры использования

**Импорт из подпути (меньший бандл):**

```typescript
import {
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client/registration';
```

**Или из основного клиентского входа:**

```typescript
import {
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
} from '@budarin/pluggable-serviceworker/client';
```

**Пример: регистрация и баннер «Доступна новая версия»**

```typescript
if ('serviceWorker' in navigator) {
    const reg = await registerServiceWorkerWithClaimWorkaround('/sw.js');

    const unsubscribe = onNewServiceWorkerVersion(reg, () => {
        showUpdateBanner(); // показать баннер
    });

    // позже: unsubscribe();
}
```

**Пример: подписка без явной регистрации**

```typescript
onNewServiceWorkerVersion((reg) => {
    console.log('Установлена новая версия SW', reg);
});
```
