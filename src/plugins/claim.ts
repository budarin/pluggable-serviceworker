import type { Plugin } from '../index.js';

export interface ClaimConfig {
    order?: number;
}

export function claim(config?: ClaimConfig): Plugin {
    const { order = 0 } = config ?? {};

    return {
        order,
        name: 'claim',

        activate: () => self.clients.claim(),
    };
}
