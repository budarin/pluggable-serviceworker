import type { ServiceWorkerPlugin } from '../index.js';

export const claim: ServiceWorkerPlugin = {
    name: 'claim',
    activate: (event, _context) => {
        event.waitUntil(self.clients.claim());
    },
};
