import type { ServiceWorkerPlugin } from '../index.js';

export const skipWaiting: ServiceWorkerPlugin = {
    name: 'skipWaiting',
    install: (_event, _context) => {
        self.skipWaiting();
    },
};
