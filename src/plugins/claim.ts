import type { Plugin } from '../index.js';

export function claim(): Plugin {
    return {
        name: 'claim',

        activate: () => self.clients.claim(),
    };
}
