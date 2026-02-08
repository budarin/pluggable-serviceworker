import {
    initServiceWorker,
    type RequiredOptions,
    type ServiceWorkerInitOptions,
} from '../index.js';

import { offlineFirst } from '../presets/offlineFirst.js';
import { claim } from '../plugins/claim.js';
import { claimOnMessage } from '../plugins/claimOnMessage.js';

const plugins: readonly [
    ...typeof offlineFirst,
    typeof claimOnMessage,
    typeof claim,
] = [...offlineFirst, claimOnMessage, claim];

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется по сигналу со страницы
 * (сообщение с type из options.claimMessageType, по умолчанию 'SW_ACTIVATE').
 * После активации вызывает clients.claim() через плагин claim.
 */
export function activateOnSignalServiceWorker(
    options: ServiceWorkerInitOptions & RequiredOptions<typeof plugins>
): void {
    initServiceWorker(plugins, options);
}
