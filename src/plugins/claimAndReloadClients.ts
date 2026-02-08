import type { ServiceWorkerPlugin } from '../index.js';
import { claimClients } from './claim.js';
import { reloadAllClients } from './reloadClients.js';

/** Хелпер: claim + перезагрузка клиентов по порядку. Для композиции в своих плагинах. */
export function runClaimAndReloadClients(): Promise<void> {
    return claimClients().then(() => reloadAllClients());
}

/**
 * Композиция примитивов claim + reloadClients: сначала clients.claim(), затем
 * перезагрузка всех окон. Порядок гарантирован (один плагин, последовательный вызов).
 */
export const claimAndReloadClients: ServiceWorkerPlugin = {
    name: 'claimAndReloadClients',
    activate: (event, _logger) => {
        event.waitUntil(runClaimAndReloadClients());
    },
};
