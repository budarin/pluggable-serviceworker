import type { ServiceWorkerInitOptions } from '../index.js';
import type { OfflineFirstConfig } from '../presets/offlineFirst.js';

import { claim } from '../plugins/claim.js';
import { initServiceWorker } from '../index.js';
import { offlineFirst } from '../presets/offlineFirst.js';
import { skipWaitingOnMessage } from '../plugins/skipWaitingOnMessage.js';

export interface ImmediatelyActivateUpdateOnSignalSWOptions
    extends ServiceWorkerInitOptions, OfflineFirstConfig {
    skipWaitingMessageType?: string;
}

/**
 * Типовой сервис-воркер: кеширование offline-first. Первая установка — сразу, при обновлении
 * активируется по сигналу со страницы (сообщение с type из options.skipWaitingMessageType,
 * по умолчанию 'SW_ACTIVATE'). После активации вызывает clients.claim() через плагин claim.
 */
export function immediatelyActivateUpdateOnSignalSW(
    options: ImmediatelyActivateUpdateOnSignalSWOptions
): void {
    const skipWaitingConfig =
        options.skipWaitingMessageType !== undefined
            ? { messageType: options.skipWaitingMessageType }
            : {};
    initServiceWorker(
        [
            ...offlineFirst(options),
            skipWaitingOnMessage(skipWaitingConfig),
            claim(),
        ],
        options
    );
}
