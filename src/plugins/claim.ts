import type { ServiceWorkerPlugin } from '../index.js';

export function claim(): ServiceWorkerPlugin {
    return {
        name: 'claim',
        activate: () => self.clients.claim(),
    };
}
