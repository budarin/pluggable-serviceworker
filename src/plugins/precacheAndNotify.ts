import type { PrecacheConfig } from './precache.js';
import type { PluginContext, ServiceWorkerPlugin } from '../index.js';

import { SW_MSG_INSTALLED } from '@budarin/http-constants/service-worker';

export interface PrecacheAndNotifyConfig extends PrecacheConfig {
    messageType?: string;
}

/** Хелпер: отправляет сообщение всем окнам-клиентам. Для переиспользования в своих плагинах. */
export async function notifyClients(
    messageType: string = SW_MSG_INSTALLED
): Promise<void> {
    const list = await self.clients.matchAll({ type: 'window' });
    list.forEach((client) => client.postMessage({ type: messageType }));
}

/**
 * Кеширует список ассетов, затем отправляет активным клиентам сообщение с указанным type.
 * Порядок гарантирован: сообщение уходит только после успешного кэширования всех ассетов.
 */
export function precacheAndNotify(
    config: PrecacheAndNotifyConfig
): ServiceWorkerPlugin<PluginContext> {
    const { cacheName, assets, messageType = SW_MSG_INSTALLED } = config;
    return {
        name: 'precacheAndNotify',
        install: async () => {
            const cache = await caches.open(cacheName);
            await cache.addAll(assets);
            await notifyClients(messageType);
        },
    };
}
