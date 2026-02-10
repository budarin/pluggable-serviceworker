import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    initServiceWorker,
    __resetServiceWorkerState,
    type ServiceWorkerPlugin,
} from '../src/index.ts';

describe('initServiceWorker', () => {
    const addEventListener = vi.mocked(
        (
            globalThis as unknown as {
                self: { addEventListener: ReturnType<typeof vi.fn> };
            }
        ).self.addEventListener
    );

    beforeEach(() => {
        __resetServiceWorkerState();
        addEventListener.mockClear();
    });

    it('registers error handlers first, then standard event handlers', () => {
        const plugins: ServiceWorkerPlugin[] = [{ name: 'test' }];
        initServiceWorker(plugins, { version: 'test-version' });

        const calls = addEventListener.mock.calls.map((c) => c[0]);
        const errorEvents = [
            'error',
            'messageerror',
            'unhandledrejection',
            'rejectionhandled',
        ];
        const standardEvents = [
            'install',
            'activate',
            'fetch',
            'message',
            'sync',
            'periodicsync',
            'push',
        ];

        const errorIndices = errorEvents.map((e) => calls.indexOf(e));
        const standardIndices = standardEvents.map((e) => calls.indexOf(e));
        const maxErrorIndex = Math.max(...errorIndices);
        const minStandardIndex = Math.min(...standardIndices);
        expect(maxErrorIndex).toBeLessThan(minStandardIndex);
    });

    it('warns when plugin names are duplicated', () => {
        const warn = vi.fn();
        const plugins: ServiceWorkerPlugin[] = [
            { name: 'duplicate' },
            { name: 'duplicate' },
            { name: 'unique' },
        ];
        initServiceWorker(plugins, {
            version: 'test-version',
            logger: {
                info: vi.fn(),
                warn,
                error: vi.fn(),
                debug: vi.fn(),
                trace: vi.fn(),
            },
        });

        expect(warn).toHaveBeenCalledWith('Duplicate plugin name: "duplicate"');
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('does not register listeners again on second call', () => {
        const plugins: ServiceWorkerPlugin[] = [{ name: 'once' }];
        initServiceWorker(plugins, { version: 'test-version' });
        const firstCallCount = addEventListener.mock.calls.length;

        initServiceWorker(plugins, { version: 'test-version' });
        const secondCallCount = addEventListener.mock.calls.length;

        expect(secondCallCount).toBe(firstCallCount);
    });
});
