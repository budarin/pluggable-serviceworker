import type { ServiceWorkerPlugin } from '../index.js';

export const claim: ServiceWorkerPlugin = {
    name: 'claim',
    activate: (event, _context) => {
        event.waitUntil(
            Promise.resolve().then(() => self.clients.claim())
        );
    },
};
