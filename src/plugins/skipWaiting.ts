import type { Plugin } from '../index.js';

export function skipWaiting(): Plugin {
    return {
        name: 'skipWaiting',

        install: (_event, _logger) => {
            self.skipWaiting();
        },
    };
}
