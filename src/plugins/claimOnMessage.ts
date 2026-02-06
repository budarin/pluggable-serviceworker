import type {
    ServiceWorkerPlugin,
    OfflineFirstContext,
    SwMessageEvent,
} from '../index.js';

const DEFAULT_CLAIM_MESSAGE_TYPE = 'SW_ACTIVATE';

export const claimOnMessage: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'claimOnMessage',
    message: (event: SwMessageEvent, context) => {
        const type = context.claimMessageType ?? DEFAULT_CLAIM_MESSAGE_TYPE;

        if (event.data?.type !== type) return;

        // self.state в Service Worker не в спецификации и отсутствует во многих браузерах — не проверяем.
        context.logger?.info?.('[claimOnMessage] Получен сигнал активации, вызываю skipWaiting()');
        self.skipWaiting();
    },
};
