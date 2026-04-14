import type { Plugin, SwMessageEvent } from '../index.js';

import { SW_MSG_SKIP_WAITING } from '@budarin/http-constants/service-worker';

import { notifyClients } from '../utils/notifyClients.js';
import { skipWaitingOnMessage } from './skipWaitingOnMessage.js';

export interface SkipWaitingAndNotifyPageReloadConfig {
    messageType?: string;
    pageReloadMessageType?: string;
    includeUncontrolled?: boolean;
    order?: number;
}

/**
 * Реагирует на сообщение skip-waiting: активирует текущий waiting SW
 * и рассылает клиентам сообщение о необходимости перезагрузки страницы.
 */
export function skipWaitingAndNotifyPageReload(
    config: SkipWaitingAndNotifyPageReloadConfig = {}
): Plugin {
    const {
        messageType = SW_MSG_SKIP_WAITING,
        pageReloadMessageType = 'PAGE RELOAD',
        includeUncontrolled = false,
        order = 0,
    } = config;
    const skipWaitingPlugin = skipWaitingOnMessage({ messageType });

    return {
        order,
        name: 'skipWaitingAndNotifyPageReload',

        message: async (event: SwMessageEvent, context) => {
            if (event.data?.type !== messageType) {
                return;
            }

            skipWaitingPlugin.message?.(event, context);
            await notifyClients(
                pageReloadMessageType,
                undefined,
                includeUncontrolled
            );
        },
    };
}
