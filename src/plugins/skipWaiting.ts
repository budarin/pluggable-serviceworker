import type { ServiceWorkerPlugin } from '../index.js';

export function skipWaiting(): ServiceWorkerPlugin {
    return {
        name: 'skipWaiting',
        install: (_event, _logger) => {
            self.skipWaiting();
        },
    };
}
