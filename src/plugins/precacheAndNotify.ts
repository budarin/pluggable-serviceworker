import type { Plugin } from '../index.js';
import type { PrecacheConfig } from './precache.js';

import {
    SW_MSG_INSTALLED,
    SW_MSG_START_INSTALLING,
} from '@budarin/http-constants/service-worker';

import { precache } from './precache.js';
import { notifyClients } from '../utils/notifyClients.js';

export interface PrecacheAndNotifyConfig extends PrecacheConfig {
    startInstallingMessage?: string;
    installedMessage?: string;
}

/**
 * Кеширует список ассетов, затем отправляет активным клиентам сообщение с указанными сообщениями.
 * Порядок гарантирован: сообщение уходит только после успешного кэширования всех ассетов.
 */
export function precacheAndNotify(config: PrecacheAndNotifyConfig): Plugin {
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
        name: 'precacheAndNotify',

        install: async (event, logger) => {
            await notifyClients(startInstallingMessage);
            await preCachePlugin.install?.(event, logger);
            await notifyClients(installedMessage);
        },
    };
}
