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

/** @deprecated Используйте PrecacheWithNotificationConfig. Оставлено для обратной совместимости. */
export type PrecacheAndNotifyConfig = PrecacheWithNotificationConfig;

/**
 * Кеширует список ассетов, затем отправляет активным клиентам сообщения
 * с указанными типами: сначала о начале установки, затем — после успешного
 * кэширования всех ассетов.
 */
export function precacheWithNotification(
    config: PrecacheWithNotificationConfig
): Plugin {
    const {
        cacheName,
        assets,
        startInstallingMessage = SW_MSG_START_INSTALLING,
        installedMessage = SW_MSG_INSTALLED,
    } = config;

    const preCachePlugin = precache({
        assets,
        cacheName,
    });

    return {
        name: 'precacheWithNotification',

        install: async (event, logger) => {
            await notifyClients(startInstallingMessage);
            await preCachePlugin.install?.(event, logger);
            await notifyClients(installedMessage);
        },
    };
}

/**
 * @deprecated Используйте precacheWithNotification. Оставлено для обратной совместимости.
 */
export function precacheAndNotify(
    config: PrecacheAndNotifyConfig
): Plugin {
    return precacheWithNotification(config);
}
