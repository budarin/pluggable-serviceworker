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

        if (event.data?.type === type) {
            self.skipWaiting();
            void self.clients.claim();
        }
    },
};
