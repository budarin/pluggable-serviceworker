# Сервисворкер: когда Workbox уже слишком тяжёлый

Сервис‑воркеры сегодня — не экзотика, а рабочий инструмент: offline‑режим, агрессивное кэширование и «живые» обновления. Под это уже давно есть отличный, проверенный Workbox, и я сам с ним работал.

Но по мере того, как я переносил один и тот же сервис‑воркер из проекта в проект, у меня всё чаще возникало ощущение, что **мне нужен инструмент с другим профилем**:

- поменьше магии и слоёв абстракции;
- попроще вход в код и в «как тут всё устроено»;
- конструктор из маленьких плагинов, которые легко прочитать глазами и отладить.

Поэтому я написал [`@budarin/pluggable-serviceworker`](https://www.npmjs.com/package/@budarin/pluggable-serviceworker) — **не вместо Workbox**, а как более лёгкий, типизированный и прозрачный рантайм для тех случаев, когда хочется полной управляемости и минимально возможной когнитивной нагрузки.

### Почему не просто Workbox?

Сразу отвечу на ожидаемый вопрос: «А почему ты не взял Workbox, он же уже всё умеет?»

Я Workbox уважаю и использовал, но вживую столкнулся с несколькими моментами:

- **Сложность API и архитектуры**
  Workbox решает очень много задач и тащит за собой свою модель роутинга, стратегий, плагинов. Это мощно, но:
    - чтобы уверенно в нём ориентироваться, нужно в голове держать довольно большой «словарь» понятий;
    - разобраться, как именно проходит запрос через все прослойки, — не всегда просто.
    - сложно что-то изменить: моё [issue](https://github.com/GoogleChrome/workbox/issues/2880#issuecomment-3441003138) с предложением опциональной параллельной загрузки ресурсов висит уже несколько лет, хотя под ним подписалось большое количество разработчиков

- **Высокая когнитивная нагрузка при кастомизации**
  Когда нужно не стандартная стратегия кэширования, а «чуть‑чуть не так», начинаются компромиссы:
    - либо подстраиваться под существующие стратегии;
    - либо уходить в свои обёртки вокруг Workbox и начинать помнить уже два уровня абстракции.

- **Сложность написания собственных плагинов**
  Строго говоря, это возможно, но для многих команд «написать свой плагин под Workbox» — это уже что‑то из разряда внутреннего фреймворка: не каждый разработчик готов в это погружаться.

Мне захотелось **минималистичного контракта**:

- один тип `ServiceWorkerPlugin` с привычными хуками (`install`, `activate`, `fetch`, `message`, `sync`, `push`, `periodicsync`, а также `backgroundfetchsuccess` / `backgroundfetchfail` / `backgroundfetchabort` / `backgroundfetchclick` для [Background Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API));
- предсказуемый порядок выполнения;
- нормальное логирование и единый `onError`;
- возможность собрать свой сервис‑воркер из очень простых кирпичиков (примитивов и пресетов), или вообще написать плагин «в лоб» за пару десятков строк.

Workbox отлично подходит, когда вы окей с его моделью и объёмом абстракций.
`@budarin/pluggable-serviceworker` — это вариант, когда хочется:

- максимально простого **модульного** сервис‑воркера,
- маленького рантайма без тяжёлых зависимостей,
- и кода, который легко понять любому фронтендеру, даже не «гуру по сервис‑воркерам».

Дальше покажу, как библиотека выглядит вживую — на двух примерах: с нуля и из готовых блоков.

### Пример 1. Свой сервис‑воркер с нуля: один плагин на установку и fetch

Напишем минималистичный, но полезный сервис‑воркер:

- сервис-воркер устанавливается при первом посещении и вступает в силу только при перезагрузке/повторном посещении страницы
- при установке — кладём статику в кеш;
- при запросе ресурса — отдаём из кеша; если ничего нет — даём запросу пойти в сеть как обычно.

```typescript
// precacheAndServePlugin.ts
import type { Plugin } from '@budarin/pluggable-serviceworker';

export function precacheAndServePlugin(config: {
    cacheName: string;
    assets: string[];
}): Plugin {
    const { cacheName, assets } = config;

    return {
        name: 'precache-and-serve',

        install: async (_event, _context) => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
        },

        fetch: async (event, context) => {
            const cache = await caches.open(cacheName);
            const asset = await cache.match(event.request.url);

            if (!asset) {
                context.logger?.debug(
                    '[SW] cache miss',
                    new URL(event.request.url).pathname
                );
            }

            // если ресурс не найден в кэше - отдаем undefined - это сигнал библиотеке чтобы вызвать следующий плагин
            // если все плагины вернули undefined - библиотека сама запросит ресурс с сервера
            return asset ?? undefined;
        },
    };
}
```

Код сервис‑воркера:

```typescript
// sw.ts
import { initServiceWorker } from '@budarin/pluggable-serviceworker';
import { precacheAndServePlugin } from './precacheAndServePlugin';

const options = {
    version: '1.0.0',
    onError: (error, event, type) => {
        console.error('[SW error]', type, error, event);
    },
};

initServiceWorker(
    [
        precacheAndServePlugin({
            cacheName: 'my-app-v1',
            assets: ['/', '/styles.css', '/main.js'],
        }),
    ],
    options
);
```

В `assets` перечисляются пути к ресурсам относительно корня приложения (`'/'`, `'/main.js'` и т.д.).

Никаких явных `self.addEventListener('install' | 'fetch')` — только декларативное описание того, **что** должен делать плагин. Вход в код для нового человека — максимально простой.

### Пример 2. Конструктор из готовых блоков: offline‑first + stale‑while‑revalidate(SWR) для запроса `'/api/posts'`

Теперь соберём что‑то посерьёзнее, но всё так же читаемое: страницы, скрипты и стили отдаём из кеша (приложение грузится быстро и работает офлайн), ленту постов — тоже из кеша, но в фоне подтягиваем свежие данные. Сервис‑воркер активируется сразу, без перезагрузки вкладки.

```typescript
// sw.ts
import { initServiceWorker, Plugin } from '@budarin/pluggable-serviceworker';
import {
    precache,
    serveFromCache,
    skipWaiting(),
    claim(),
    pruneStaleCache,
    staleWhileRevalidate,
} from '@budarin/pluggable-serviceworker/plugins';

const staticCache = 'static-v1';
const postsCache = 'posts-v1';
const assets = ['/', '/main.js', '/styles.css'];

const options = {
    version: '1.0.0',
    onError: (error, event, type) => {
        console.error('[SW error]', type, error, event);
    },
};

// код нашего плагина
function postsSwrPlugin(config: {
    cacheName: string;
    pathPattern?: RegExp;
}): Plugin {
    const { cacheName, pathPattern = /\/api\/posts(\/|$)/ } = config;
    const swr = staleWhileRevalidate({ cacheName });

    return {
        name: 'posts-swr',

        async fetch(event, context) {
            const url = new URL(event.request.url);

            if (!pathPattern.test(url.pathname)) {
                return undefined;
            }

            context.logger?.info('[SW] posts SWR for', url.pathname);

            // вызываем код существующего плагина SWR
            return swr.fetch!(event, context);
        },
    };
}

initServiceWorker(
    [
        // install: будут вызываны параллельно
        precache({ assets, cacheName: staticCache }),
        skipWaiting(),

        // activate
        claim(),

        // fetch: цепочка вызовов пока кто-нибудь не вернет ресурс
        serveFromCache({ cacheName: staticCache }),
        postsSwrPlugin({ cacheName: postsCache }),
        // иначе запрос уйдет в сеть
    ],
    options
);
```

Смотрим на массив плагинов — и видим весь сценарий:

- какие кеши есть;
- как активируется SW;
- какие URL‑ы попадают под SWR‑логику;
- что происходит, если ни один `fetch`‑плагин не ответил - пакет сам сходит за ресурсом на сервер.

### Регистрация на клиенте: обход бага с `claim()` и обновления

С клиентской стороны можно использовать готовые утилиты:

```typescript
// main.ts
import {
    isServiceWorkerSupported,
    registerServiceWorkerWithClaimWorkaround,
    onNewServiceWorkerVersion,
    onServiceWorkerMessage,
    pingServiceWorker,
} from '@budarin/pluggable-serviceworker/client';

if (isServiceWorkerSupported()) {
    (async () => {
        // обходим баг Chrome
        const reg = await registerServiceWorkerWithClaimWorkaround('/sw.js');

        const unsubscribeUpdate = onNewServiceWorkerVersion(reg, () => {
            // здесь можно показать баннер "Доступна новая версия приложения"
            console.log('New Service Worker version is ready!');
        });

        const unsubscribeMsg = onServiceWorkerMessage(
            'SW_MSG_NEW_VERSION_READY',
            () => {
                // здесь – баннер "Новая версия установлена, перезагрузите страницу"
                console.log('New assets cached, you can reload the page.');
            }
        );

        window.addEventListener('focus', async () => {
            await pingServiceWorker();
        });

        // позже, когда подписки больше не нужны:
        unsubscribeUpdate();
        unsubscribeMsg();
    })();
}
```

Во время разработки был обнаружен и зарегистрирован баг в Google Chrome - во время 1-й установки сервис-воркера с вызовом `claim()` сервис-воркер активируется, но страница остается без контроллера до перезагрузки. [issue-482903583](https://issues.chromium.org/issues/482903583#comment1)

### Что делает данный пакет особенным

**Коротко:**

- **Плагинная архитектура**
    - Обычные объекты с хуками `install` / `activate` / `fetch` / …
    - Каждый плагин делает свою задачу (кеш, авторизация, нотификации, SWR для API и т.д.).

- **Прозрачный порядок выполнения**
    - Под капотом: под каждый тип событий (`install`, `activate`, `fetch`, `message`, `sync`, `periodicsync`, `push`, события Background Fetch) создаётся свой массив обработчиков. Плагины сортируются по `order` (по возрастанию, по умолчанию 0); в этом порядке обработчики попадают в массивы. Подписка на событие добавляется **только если есть хотя бы один плагин** для этого события. При наступлении события в сервис‑воркере вызываются обработчики из нужного массива.
    - Порядок важен для `fetch` и `push` (последовательное выполнение). Для остальных событий (`install`, `activate`, `message`, `sync`, `periodicsync`, события Background Fetch) обработчики выполняются параллельно. Используйте `order` в конфиге плагина для управления порядком выполнения.
    - `install` / `activate` / `message` / `sync` / `periodicsync` — обработчики выполняются параллельно;
    - `fetch` — последовательно, с понятной логикой прерывания;
    - `push` — все обработчики выполняются последовательно; отображение уведомлений по возвращённым payload'ам выполняется параллельно.

- **Централизованный `onError` и нормальный логгер**
  Один обработчик ошибок для всего SW и единый `logger` c `trace/debug/info/warn/error` во всех плагинах.

- **Готовые примитивы, пресеты и типовые SW**
  Можно:
    - писать свои плагины с нуля;
    - или собирать SW из готовых блоков:
        - плагины: `precache`, `cacheFirst`, `networkFirst`, `staleWhileRevalidate`, `serveFromCache`, `restoreAssetToCache`, `skipWaiting`, `claim`, `reloadClients`, `claimAndReloadClients`, `precacheMissing`, `precacheWithNotification`
        - пресет: `offlineFirst`
        - готовые SW: `activateAndUpdateOnNextVisitSW`, `immediatelyActivateAndUpdateSW`, `immediatelyActivateUpdateOnSignalSW`

- **Клиентские утилиты**
  Регистрация SW с обходом бага `claim()`, подписка на новую версию, сообщения от SW, `ping` для «пробуждения» и прочее.

### Установка

```bash
npm install @budarin/pluggable-serviceworker
# или
pnpm add @budarin/pluggable-serviceworker
```

### Где посмотреть живьём

Репозиторий: [`github.com/budarin/pluggable-serviceworker`](https://github.com/budarin/pluggable-serviceworker)
Пакет в npm: [`@budarin/pluggable-serviceworker`](https://www.npmjs.com/package/@budarin/pluggable-serviceworker)

В репозитории есть демо‑приложение на React + Vite в папке `demo/`:

- пресет `offlineFirst`;
- типовой сервис‑воркер `activateOnSignal`;
- пример клиентского кода с `registerServiceWorkerWithClaimWorkaround`, `onNewServiceWorkerVersion`, `onServiceWorkerMessage`, `pingServiceWorker` и т.д.

Это нормальное живое приложение, а не «сферический пример в вакууме» — можно клонировать, запустить и посмотреть, как оно ведёт себя в браузере.

### Когда `@budarin/pluggable-serviceworker` заходит лучше всего

Я не пытаюсь сказать «забудьте про Workbox». У него огромный функционал и своя ниша. Но есть сценарии, где хочется именно такого формата, как в этом пакете:

- **Нужен простой старт**
  Хочется, чтобы джун/мидл за вечер собрал рабочий SW и понимал, что там происходит, а не тонул в слоях абстракций.

- **Проектов несколько, инфраструктура одна**
  Вы хотите переиспользовать одни и те же плагины (`precache`, `auth`, SWR‑кеш для API, нотификации) между разными фронтендами без копипасты и без втаскивания всего Workbox.

- **Нужен полный контроль**
  Важно точно знать, в каком порядке и что выполняется в `install/activate/fetch/push`, и иметь один `onError`, который видит все типы ошибок — от падения внутри плагина до `unhandledrejection` в SW.

- **Не хочется тянуть тяжёлый рантайм**
  Проект чувствителен к размеру бандла и количеству зависимостей, а задача — «просто собрать несколько плагинов и жить спокойно».

Если вы уже живёте с Workbox и он вас всем устраивает — отлично, продолжайте. Если же вы регулярно ловите себя на мысли «хочу сделать чуть‑чуть по‑своему, но лезть в кишки Workbox не хочется» — возможно, мой пакет как раз тот более лёгкий инструмент, которого не хватало между «писать всё руками» и «тянуть огромный фреймворк».

### Итоги и что дальше

Мне хотелось, чтобы сервис‑воркер в проекте выглядел как **набор явных, маленьких модулей**, а не как один большой файл с десятком обработчиков событий и размытыми границами ответственности. Из этого желания и вырос `@budarin/pluggable-serviceworker`:

- плагинный контракт, который можно объяснить за 5 минут;
- предсказуемый порядок выполнения хуков;
- централизованный `onError` и единый логгер;
- куча готовых примитивов и пресетов, но без навязанной «мегастратегии».

Если вам близок такой подход — попробуйте собрать свой первый SW из одного‑двух плагинов, а потом постепенно достроить до нужного вам монстра.

Буду рад любому фидбеку: ишью в репозитории, идеям новых примитивов/пресетов, историям. Токсичному фидбэку рад не буду - не пишите ! 😊
