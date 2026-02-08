import type { ServiceWorkerPlugin } from '../index.js';

/** Хелпер: перезагружает все окна-клиенты через client.navigate(client.url). Для композиции в своих плагинах. */
export async function reloadAllClients(): Promise<void> {
    const list = await self.clients.matchAll({ type: 'window' });
    await Promise.all(list.map((client) => client.navigate(client.url)));
}

export const reloadClients: ServiceWorkerPlugin = {
    name: 'reloadClients',
    activate: (event, _context) => {
        event.waitUntil(reloadAllClients());
    },
};
