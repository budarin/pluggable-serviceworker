# Демо: React + Vite + offlineFirst

Минимальное приложение на React и Vite с Service Worker на пресете **offlineFirst** и активацией по сигналу со страницы (`activateOnSignalServiceWorker`).

## Локальный запуск (с SW и офлайном)

Из корня репозитория:

```bash
pnpm install
pnpm build
cd demo && pnpm install && pnpm run build && pnpm run preview
```

Откройте указанный URL (обычно `http://localhost:4173`). В DevTools → Network включите «Offline» и обновите страницу — контент должен отдаваться из кеша.

## Сборка

```bash
cd demo
pnpm run build
pnpm run preview
```

При каждом запросе `sw.js` сервер (в демо — `vite preview`) отдаёт его с заголовками `Cache-Control: no-store, no-cache`, поэтому браузер при проверке обновлений не использует кеш и получает актуальный скрипт. На своём проде настройте то же самое для пути к SW.

## Песочницы (онлайн-демо)

Демо можно открыть в публичных песочницах (предварительно соберите библиотеку в корне: `pnpm build`):

- **StackBlitz:** [Open in StackBlitz](https://stackblitz.com/github/budarin/pluggable-serviceworker/tree/master/demo) — замените `budarin/pluggable-serviceworker` на ваш форк/репо при необходимости.
- **CodeSandbox:** [Open in CodeSandbox](https://codesandbox.io/s/github/budarin/pluggable-serviceworker/tree/master/demo); либо импортируйте репозиторий вручную и укажите корень приложения как папку `demo`.

В песочнице сначала соберите: в корне репо выполните `pnpm install`, `pnpm build`; затем в папке `demo` — `pnpm install`, `pnpm run build`. После этого запустите `pnpm run start` (в CodeSandbox кнопка Start вызовет скрипт `start` и подставит нужный порт).

## Что демонстрируется

- Регистрация SW из приложения (`/sw.js`).
- Пресет `offlineFirst`: precache при `install`, отдача из кеша в `fetch`.
- Плагин `claimOnMessage`: по сообщению `SW_ACTIVATE` со страницы — `skipWaiting`; плагин `claim` в `activate` вызывает `clients.claim()`.
- Кнопка «Применить» отправляет сообщение **ожидающему** воркеру (`reg.waiting`), после чего он активируется и забирает клиентов.
- Если после «Проверить обновление» кнопка «Применить» не появляется и новая версия сразу активна — в Chrome DevTools (Application → Service Workers) снимите галку **Update on reload**. Для отладки: откройте консоль у воркера (кнопка «inspect» у SW). При нажатии «Применить» там появится лог `[claimOnMessage] Получен сигнал активации`; если этот лог есть без нажатия — сигнал шлёт другой код (вкладка, расширение).
- Индикатор онлайн/офлайн и статус SW.
