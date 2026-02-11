import type { Plugin } from '../index.js';

import { claim } from './claim.js';
import { reloadClients } from './reloadClients.js';

/**
 * Композиция примитивов claim + reloadClients: вызываем их activate по очереди.
 * Порядок гарантирован (один плагин, последовательный вызов).
 */
export function claimAndReloadClients(): Plugin {
    const claimPlugin = claim();
    const reloadPlugin = reloadClients();

    return {
        name: 'claimAndReloadClients',

        activate: async (event, logger) => {
            await claimPlugin.activate?.(event, logger);
            await reloadPlugin.activate?.(event, logger);
        },
    };
}
