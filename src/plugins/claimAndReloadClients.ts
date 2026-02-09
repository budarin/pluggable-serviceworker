import type { ServiceWorkerPlugin } from '../index.js';

/**
 * Композиция claim + reloadClients: сначала clients.claim(), затем перезагрузка всех окон.
 * Порядок гарантирован (один плагин, последовательный вызов).
 */
export const claimAndReloadClients: ServiceWorkerPlugin = {
    name: 'claimAndReloadClients',
    activate: () =>
        self.clients.claim().then(() =>
            self.clients
                .matchAll({ type: 'window' })
                .then((list) =>
                    Promise.all(
                        list.map((client) => client.navigate(client.url))
                    ).then(() => {})
                )
        ),
};
