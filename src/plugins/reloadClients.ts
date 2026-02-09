import type { ServiceWorkerPlugin } from '../index.js';

export function reloadClients(): ServiceWorkerPlugin {
    return {
        name: 'reloadClients',
        activate: async () => {
            const list = await self.clients.matchAll({ type: 'window' });
            await Promise.all(
                list.map((client) => client.navigate(client.url))
            );
        },
    };
}
