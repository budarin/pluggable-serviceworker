## 1.6.0

- Добавлен обязательный параметр `version` в `ServiceWorkerInitOptions` и пресеты типовых SW.
- Внутренний плагин версии: SW отвечает на запрос версии (`getServiceWorkerVersion()` на клиенте).
- Внутренний ping-плагин (`GET /sw-ping`), плюс клиентская утилита `pingServiceWorker()` для "пробуждения" SW (особенно полезно на мобильных после сна устройства).
- Новый клиентский API:
  - `onNewServiceWorkerVersion` — детект новой версии SW;
  - `onServiceWorkerMessage` — подписка на сообщения от SW;
  - `isServiceWorkerSupported` — проверка поддержки SW;
  - `postMessageToServiceWorker` — отправка сообщений в SW с мягким fallback;
  - `getServiceWorkerVersion` — запрос версии SW;
  - `pingServiceWorker` — ping SW через `GET /sw-ping`.

> Примечание: версии до 1.6.0 в changelog не описаны, т.к. пакет находился в фазе быстрого экспериментов и API мог меняться без явной фиксации.

