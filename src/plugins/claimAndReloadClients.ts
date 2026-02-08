import type { ServiceWorkerPlugin } from '../index.js';

/**
 * Примитив: в activate сначала clients.claim(), затем перезагрузка всех окон-клиентов
 * через client.navigate(client.url). Гарантирует порядок выполнения (claim, затем reload).
 */
export const claimAndReloadClients: ServiceWorkerPlugin = {
    name: 'claimAndReloadClients',
    activate: (event, _context) => {
        event.waitUntil(
            (async (): Promise<void> => {
                await self.clients.claim();
                const list = await self.clients.matchAll({ type: 'window' });
                await Promise.all(
                    list.map((client) => client.navigate(client.url))
                );
            })()
        );
    },
};
