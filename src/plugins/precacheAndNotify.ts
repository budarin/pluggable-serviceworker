import type { Plugin } from '../index.js';
import type { PrecacheConfig } from './precache.js';

import {
    SW_MSG_INSTALLED,
    SW_MSG_START_INSTALLING,
} from '@budarin/http-constants/service-worker';

import { precache } from './precache.js';
import { notifyClients } from '../utils/notifyClients.js';

export interface PrecacheWithNotificationConfig extends PrecacheConfig {
    startInstallingMessage?: string;
    installedMessage?: string;
}

/**
 * Кеширует список ассетов, затем отправляет активным клиентам сообщения
 * с указанными типами: сначала о начале установки, затем — после успешного
 * кэширования всех ассетов.
 */
export function precacheWithNotification(
    config: PrecacheWithNotificationConfig
): Plugin {
    const {
        assets,
        cacheName,
        startInstallingMessage = SW_MSG_START_INSTALLING,
        installedMessage = SW_MSG_INSTALLED,
        order = 0,
    } = config;

    const preCachePlugin = precache({
        assets,
        cacheName,
        order,
    });

    return {
        order,
        name: 'precacheWithNotification',

        install: async (event, context) => {
            await notifyClients(startInstallingMessage);
            await preCachePlugin.install?.(event, context);
            await notifyClients(installedMessage);
        },
    };
}
