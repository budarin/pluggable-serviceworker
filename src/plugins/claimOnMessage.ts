import type {
    SwMessageEvent,
    PluginContext,
    ServiceWorkerPlugin,
} from '../index.js';

import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

export interface ClaimOnMessageContext extends PluginContext {
    claimMessageType?: string;
}

export const claimOnMessage: ServiceWorkerPlugin<ClaimOnMessageContext> = {
    name: 'claimOnMessage',
    message: (event: SwMessageEvent, context) => {
        const type = context.claimMessageType ?? SW_MSG_SKIP_WAITING;

        if (event.data?.type !== type) return;

        self.skipWaiting();
    },
};
