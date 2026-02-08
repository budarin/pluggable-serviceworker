import type { ServiceWorkerPlugin } from '../index.js';
import { claimClients } from './claim.js';
import { reloadAllClients } from './reloadClients.js';

/**
 * Композиция примитивов claim + reloadClients: сначала clients.claim(), затем
 * перезагрузка всех окон. Порядок гарантирован (один плагин, последовательный вызов).
 */
export const claimAndReloadClients: ServiceWorkerPlugin = {
    name: 'claimAndReloadClients',
    activate: (event, _context) => {
        event.waitUntil(
            (async (): Promise<void> => {
                await claimClients();
                await reloadAllClients();
            })()
        );
    },
};
