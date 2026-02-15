# Клиент: Background Fetch

[English](https://github.com/budarin/pluggable-serviceworker/blob/master/src/client/backgroundFetch/README.md)

Утилиты для [Background Fetch API](https://developer.mozilla.org/ru/docs/Web/API/Background_Fetch_API): запуск, мониторинг и отмена фоновых загрузок. Требуется зарегистрированный Service Worker; загрузки продолжаются при закрытой вкладке, браузер показывает прогресс.

---

## Экспорты

| Имя                              | Описание                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `isBackgroundFetchSupported`     | Проверка доступности Background Fetch (SW + `registration.backgroundFetch`). |
| `startBackgroundFetch`           | Запуск фоновой загрузки; возвращает `BackgroundFetchRegistration`.           |
| `getBackgroundFetchRegistration` | Получить регистрацию фоновой загрузки по id (например после перезагрузки).   |
| `getBackgroundFetchIds`          | Список id всех активных фоновых загрузок.                                    |
| `abortBackgroundFetch`           | Отменить фоновую загрузку по id.                                             |

---

## 1. `isBackgroundFetchSupported()`

Проверяет, что Service Worker поддерживается и есть `registration.backgroundFetch`. **Вызывайте перед любым другим вызовом Background Fetch.**

- **Возвращает:** `Promise<boolean>`.

**Пример:**

```typescript
import { isBackgroundFetchSupported } from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
if (!(await isBackgroundFetchSupported())) {
    console.warn('Background Fetch недоступен');
    return;
}
// Можно безопасно вызывать startBackgroundFetch, getBackgroundFetchRegistration и т.д.
```

---

## 2. `startBackgroundFetch(registration, id, requests, options?)`

Запускает фоновую загрузку. Загрузка продолжается при закрытии вкладки; браузер показывает UI прогресса (например в загрузках). Возвращает **BackgroundFetchRegistration**, через которую можно отслеживать прогресс и получать ответы.

**Параметры:**

| Параметр       | Тип                                      | Описание                                                                                               |
| -------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `registration` | `ServiceWorkerRegistration`              | например `await navigator.serviceWorker.ready`                                                         |
| `id`           | `string`                                 | Уникальный id этой загрузки (используется в `getBackgroundFetchRegistration` / `abortBackgroundFetch`) |
| `requests`     | `(string \| Request)[]`                  | URL или объекты `Request` для загрузки                                                                 |
| `options`      | `BackgroundFetchUIOptions` (опционально) | см. ниже                                                                                               |

**`BackgroundFetchUIOptions`** (все поля опциональны):

| Свойство        | Тип               | Описание                                                                                                                |
| --------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `title`         | `string`          | Заголовок в UI прогресса браузера                                                                                       |
| `icons`         | `ImageResource[]` | Иконки для UI: `{ src, sizes?, type?, label? }`                                                                         |
| `downloadTotal` | `number`          | Оценка общего размера в байтах; для отображения прогресса. При превышении фактической загрузкой — загрузка прерывается. |

- **Возвращает:** `Promise<BackgroundFetchRegistration>`. Reject при недоступности SW или Background Fetch, либо при неверных данных (дубликат id, запрос no-cors, превышение квоты и т.д.).

**Пример — запуск со всеми опциями и использование регистрации:**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;

if (!(await isBackgroundFetchSupported())) {
    return;
}

const id = 'episode-5-' + Date.now();
const bgReg = await startBackgroundFetch(
    reg,
    id,
    ['/ep-5.mp3', '/ep-5-artwork.jpg'],
    {
        title: 'Эпизод 5: Интересные вещи',
        icons: [
            {
                src: '/ep-5-icon.png',
                sizes: '300x300',
                type: 'image/png',
                label: 'Эпизод 5',
            },
        ],
        downloadTotal: 60 * 1024 * 1024, // 60 МБ оценка
    }
);

// Используем bgReg: progress, result, failureReason, match, matchAll, abort (см. ниже)
```

---

## 3. `getBackgroundFetchRegistration(registration, id)`

Возвращает **BackgroundFetchRegistration** по указанному id. Нужна для продолжения мониторинга после перезагрузки страницы или проверки статуса загрузки, запущенной в другом месте.

- **`registration`** — `ServiceWorkerRegistration`.
- **`id`** — id, переданный в `startBackgroundFetch`.
- **Возвращает:** `Promise<BackgroundFetchRegistration | undefined>` — `undefined`, если не найдено или API не поддерживается.

**Пример — после перезагрузки: список загрузок и повторная подписка на progress:**

```typescript
import {
    getBackgroundFetchIds,
    getBackgroundFetchRegistration,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const ids = await getBackgroundFetchIds(reg);

for (const id of ids) {
    const bgReg = await getBackgroundFetchRegistration(reg, id);

    if (!bgReg) {
        continue;
    }

    console.log(
        'Загрузка',
        bgReg.id,
        'загружено',
        bgReg.downloaded,
        '/',
        bgReg.downloadTotal
    );

    if (bgReg.result === 'success') {
        console.log('Успешно завершено');
    }

    if (bgReg.result === 'failure') {
        console.log('Ошибка:', bgReg.failureReason);
    }

    bgReg.addEventListener('progress', () => {
        const pct = bgReg.downloadTotal
            ? Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100)
            : 0;
        console.log(`${bgReg.id}: ${pct}%`);
    });
}
```

---

## 4. `getBackgroundFetchIds(registration)`

Возвращает список **активных** id фоновых загрузок для данной регистрации. Используйте для списка «Мои загрузки» или для обхода и вызова `getBackgroundFetchRegistration(reg, id)` по каждому id.

- **`registration`** — `ServiceWorkerRegistration`.
- **Возвращает:** `Promise<string[]>` — пустой массив, если API не поддерживается.

**Пример — список всех загрузок и их статус:**

```typescript
import {
    getBackgroundFetchIds,
    getBackgroundFetchRegistration,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const ids = await getBackgroundFetchIds(reg);

for (const id of ids) {
    const bgReg = await getBackgroundFetchRegistration(reg, id);

    if (!bgReg) {
        continue;
    }

    console.log({
        id: bgReg.id,
        downloaded: bgReg.downloaded,
        downloadTotal: bgReg.downloadTotal,
        result: bgReg.result,
        failureReason: bgReg.failureReason,
    });
}
```

---

## 5. `abortBackgroundFetch(registration, id)`

Отменяет фоновую загрузку с указанным id. Удобная обёртка: находит регистрацию по id и вызывает `bgReg.abort()`.

- **`registration`** — `ServiceWorkerRegistration`.
- **`id`** — id загрузки.
- **Возвращает:** `Promise<boolean>` — `true`, если загрузка найдена и отменена, иначе `false`.

**Пример:**

```typescript
import { abortBackgroundFetch } from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;
const cancelled = await abortBackgroundFetch(reg, 'my-download-123');

if (cancelled) {
    console.log('Загрузка отменена');
}
```

**Вариант — отмена через объект регистрации:**

```typescript
const bgReg = await getBackgroundFetchRegistration(reg, id);

if (bgReg) {
    await bgReg.abort(); // тот же эффект
}
```

---

## BackgroundFetchRegistration (возвращается из `startBackgroundFetch` / `getBackgroundFetchRegistration`)

Объект, возвращаемый `startBackgroundFetch` и `getBackgroundFetchRegistration`, — это [BackgroundFetchRegistration](https://developer.mozilla.org/ru/docs/Web/API/BackgroundFetchRegistration). Через него отслеживают прогресс, читают результат и получают тела ответов.

### Свойства (только чтение)

| Свойство           | Тип       | Описание                                                                                                                 |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`               | `string`  | Id загрузки.                                                                                                             |
| `uploadTotal`      | `number`  | Всего байт для отправки (обычно 0 для GET).                                                                              |
| `uploaded`         | `number`  | Уже отправлено байт.                                                                                                     |
| `downloadTotal`    | `number`  | Общий размер загрузки в байтах (из options или 0).                                                                       |
| `downloaded`       | `number`  | Уже загружено байт.                                                                                                      |
| `result`           | `string`  | Изначально `""`; по завершении `"success"` или `"failure"`.                                                              |
| `failureReason`    | `string`  | Причина при ошибке: `""`, `"aborted"`, `"bad-status"`, `"fetch-error"`, `"quota-exceeded"`, `"download-total-exceeded"`. |
| `recordsAvailable` | `boolean` | Доступны ли записи ответов (для `match` / `matchAll`).                                                                   |

### Методы

| Метод                | Описание                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `abort()`            | Отменяет эту загрузку. Возвращает `Promise<boolean>`.                                                                                                                       |
| `match(request)`     | Возвращает `Promise<BackgroundFetchRecord \| undefined>` для первого совпадающего запроса (URL или `Request`). Используйте `record.responseReady` для получения `Response`. |
| `matchAll(request?)` | Возвращает `Promise<BackgroundFetchRecord[]>` по всем (или совпадающим) запросам.                                                                                           |

### Событие: `progress`

Срабатывает при изменении `uploaded`, `downloaded`, `result` или `failureReason`. Используйте для обновления прогресс-бара или текста статуса.

**Пример — прогресс и завершение:**

```typescript
const bgReg = await startBackgroundFetch(reg, id, urls, {
    title: 'Моя загрузка',
});

bgReg.addEventListener('progress', () => {
    if (bgReg.downloadTotal > 0) {
        const pct = Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100);
        updateProgressBar(pct);
    }

    if (bgReg.result === 'success') {
        console.log('Загрузка успешно завершена');
    }

    if (bgReg.result === 'failure') {
        console.error('Загрузка не удалась:', bgReg.failureReason);
    }
});
```

**Пример — получить ответ по одному URL через `match()`:**

```typescript
const bgReg = await startBackgroundFetch(reg, id, ['/video.mp4'], {
    title: 'Видео',
});

// После завершения (например в обработчике progress при bgReg.result === 'success'):
const record = await bgReg.match('/video.mp4');

if (record) {
    const response = await record.responseReady;
    const blob = await response.blob();
    // например создать object URL, сохранить в IndexedDB и т.д.
}
```

**Пример — получить все ответы через `matchAll()`:**

```typescript
const records = await bgReg.matchAll();

for (const record of records) {
    const response = await record.responseReady;
    console.log(record.request.url, response.status);
}
```

---

## Полный пример (все методы)

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';

const reg = await navigator.serviceWorker.ready;

// 1) Проверка поддержки
if (!(await isBackgroundFetchSupported())) {
    console.warn('Background Fetch не поддерживается');
    return;
}

// 2) Запуск загрузки (все опции)
const id = 'my-fetch-' + Date.now();
const bgReg = await startBackgroundFetch(
    reg,
    id,
    ['/large-file.zip', '/meta.json'],
    {
        title: 'Моя загрузка',
        downloadTotal: 100 * 1024 * 1024,
    }
);

// 3) Использование регистрации: progress, result
bgReg.addEventListener('progress', () => {
    const pct = bgReg.downloadTotal
        ? Math.round((bgReg.downloaded / bgReg.downloadTotal) * 100)
        : 0;

    console.log('Прогресс:', pct + '%');

    if (bgReg.result === 'success') {
        console.log('Готово');
    }

    if (bgReg.result === 'failure') {
        console.log('Ошибка:', bgReg.failureReason);
    }
});

// 4) Позже: список всех загрузок
const ids = await getBackgroundFetchIds(reg);
console.log('Активные загрузки:', ids);

// 5) Получить ту же регистрацию по id (например после перезагрузки)
const same = await getBackgroundFetchRegistration(reg, id);

if (same) {
    console.log(
        'Продолжено:',
        same.downloaded,
        '/',
        same.downloadTotal,
        same.result
    );
}

// 6) Отмена по id
await abortBackgroundFetch(reg, id);
```

---

## Импорт

**Подпуть (меньший бандл):**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client/background-fetch';
```

**Основной клиентский вход:**

```typescript
import {
    isBackgroundFetchSupported,
    startBackgroundFetch,
    getBackgroundFetchRegistration,
    getBackgroundFetchIds,
    abortBackgroundFetch,
} from '@budarin/pluggable-serviceworker/client';
```
