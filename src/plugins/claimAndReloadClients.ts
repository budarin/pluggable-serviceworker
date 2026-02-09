import type { Plugin } from '../index.js';

/**
 * Композиция claim + reloadClients: сначала clients.claim(), затем перезагрузка всех окон.
 * Порядок гарантирован (один плагин, последовательный вызов).
 */
export function claimAndReloadClients(): Plugin {
    return {
        name: 'claimAndReloadClients',

        activate: () =>
            self.clients
                .claim()
                .then(() =>
                    self.clients
                        .matchAll({ type: 'window' })
                        .then(
                            (list) =>
                                Promise.all(
                                    list.map((client) =>
                                        client.navigate(client.url)
                                    )
                                ) as Promise<unknown> as Promise<void>
                        )
                ),
    };
}
