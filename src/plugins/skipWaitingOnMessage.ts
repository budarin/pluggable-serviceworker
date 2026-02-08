import type {
    PluginContext,
    SwMessageEvent,
    ServiceWorkerPlugin,
} from '../index.js';

import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

export interface SkipWaitingOnMessageConfig {
    messageType?: string;
}

export function skipWaitingOnMessage(
    config: SkipWaitingOnMessageConfig = {}
): ServiceWorkerPlugin<PluginContext> {
    const type = config.messageType ?? SW_MSG_SKIP_WAITING;
    return {
        name: 'skipWaitingOnMessage',
        message: (event: SwMessageEvent) => {
            if (event.data?.type !== type) return;
            self.skipWaiting();
        },
    };
}
