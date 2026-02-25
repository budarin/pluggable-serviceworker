import type { Plugin } from '../index.js';

import { claim } from './claim.js';
import { reloadClients } from './reloadClients.js';

export interface ClaimAndReloadClientsConfig {
    order?: number;
}

/**
 * Композиция примитивов claim + reloadClients: вызываем их activate по очереди.
 * Порядок гарантирован (один плагин, последовательный вызов).
 */
export function claimAndReloadClients(
    config?: ClaimAndReloadClientsConfig
): Plugin {
    const { order = 0 } = config ?? {};
    const claimPlugin = claim();
    const reloadPlugin = reloadClients();

    return {
        order,
        name: 'claimAndReloadClients',

        activate: async (event, context) => {
            await claimPlugin.activate?.(event, context);
            await reloadPlugin.activate?.(event, context);
        },
    };
}
