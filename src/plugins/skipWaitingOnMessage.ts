import type { Plugin, SwMessageEvent } from '../index.js';

import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

export interface SkipWaitingOnMessageConfig {
    messageType?: string;
}

export function skipWaitingOnMessage(
    config: SkipWaitingOnMessageConfig = {}
): Plugin {
    const { messageType = SW_MSG_SKIP_WAITING } = config;

    return {
        name: 'skipWaitingOnMessage',

        message: (event: SwMessageEvent) => {
            if (event.data?.type !== messageType) {
                return;
            }

            self.skipWaiting();
        },
    };
}
