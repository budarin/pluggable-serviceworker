import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants';
import type {
    ServiceWorkerPlugin,
    OfflineFirstContext,
    SwMessageEvent,
} from '../index.js';

export const claimOnMessage: ServiceWorkerPlugin<OfflineFirstContext> = {
    name: 'claimOnMessage',
    message: (event: SwMessageEvent, context) => {
        const type = context.claimMessageType ?? SW_MSG_SKIP_WAITING;

        if (event.data?.type !== type) return;

        self.skipWaiting();
    },
};
