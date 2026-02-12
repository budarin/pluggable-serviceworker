import type { Plugin } from '../index.js';

export interface ReloadClientsConfig {
    order?: number;
}

export function reloadClients(config?: ReloadClientsConfig): Plugin {
    const { order = 0 } = config ?? {};

    return {
        order,
        name: 'reloadClients',

        activate: async () => {
            const list = await self.clients.matchAll({ type: 'window' });

            await Promise.all(
                list.map((client) => client.navigate(client.url))
            );
        },
    };
}
