import type { ServiceWorkerInitOptions } from '../index.js';
import { initServiceWorker } from '../index.js';

import {
    offlineFirst,
    type OfflineFirstConfig,
} from '../presets/offlineFirst.js';
import { claim } from '../plugins/claim.js';
import { skipWaitingOnMessage } from '../plugins/skipWaitingOnMessage.js';

export interface ActivateOnSignalOptions
    extends ServiceWorkerInitOptions,
        OfflineFirstConfig {
    skipWaitingMessageType?: string;
}

/**
 * Типовой сервис-воркер: кеширование offline-first, активируется по сигналу со страницы
 * (сообщение с type из options.skipWaitingMessageType, по умолчанию 'SW_ACTIVATE').
 * После активации вызывает clients.claim() через плагин claim.
 */
export function activateOnSignalServiceWorker(
    options: ActivateOnSignalOptions
): void {
    const skipWaitingConfig =
        options.skipWaitingMessageType !== undefined
            ? { messageType: options.skipWaitingMessageType }
            : {};
    initServiceWorker(
        [...offlineFirst(options), skipWaitingOnMessage(skipWaitingConfig), claim],
        options
    );
}
