import type { Plugin } from '../index.js';

export interface SkipWaitingConfig {
    order?: number;
}

export function skipWaiting(config?: SkipWaitingConfig): Plugin {
    const { order = 0 } = config ?? {};
    return {
        order,
        name: 'skipWaiting',

        install: (_event, _context) => {
            self.skipWaiting();
        },
    };
}
