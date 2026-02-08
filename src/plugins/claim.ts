import type { ServiceWorkerPlugin } from '../index.js';

/** Хелпер: забирает всех клиентов под контроль этого SW. Для композиции в своих плагинах. */
export function claimClients(): Promise<void> {
    return self.clients.claim();
}

export const claim: ServiceWorkerPlugin = {
    name: 'claim',
    activate: (event, _logger) => {
        event.waitUntil(claimClients());
    },
};
