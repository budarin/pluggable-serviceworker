import type {
    SwMessageEvent,
    ServiceWorkerPlugin,
    OfflineFirstContext,
} from '../index.js';

import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants';

export const claimOnMessage: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'claimOnMessage',
    message: (event: SwMessageEvent, context) => {
        const type = context.claimMessageType ?? SW_MSG_SKIP_WAITING;

        if (event.data?.type !== type) return;

        self.skipWaiting();
    },
};
