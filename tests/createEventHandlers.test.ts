import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createEventHandlers,
    serviceWorkerErrorTypes,
    PSW_PASSTHROUGH_HEADER,
    type ServiceWorkerPlugin,
    type ServiceWorkerInitOptions,
} from '../src/index.ts';

describe('createEventHandlers', () => {
    describe('plugin order', () => {
        it('calls install handlers sorted by order (default 0)', async () => {
            const order: string[] = [];
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'third',
                    order: 2,
                    install: () => {
                        order.push('third');
                    },
                },
                {
                    name: 'first',
                    // no order - defaults to 0
                    install: () => {
                        order.push('first');
                    },
                },
                {
                    name: 'second',
                    order: 1,
                    install: () => {
                        order.push('second');
                    },
                },
                {
                    name: 'fourth',
                    // no order - defaults to 0
                    install: () => {
                        order.push('fourth');
                    },
                },
            ];
            const config: ServiceWorkerInitOptions = { version: '1.0.0' };
            const handlers = createEventHandlers(plugins, config);

            const waitUntil = vi.fn((p: Promise<unknown>) => p);
            handlers.install({ waitUntil } as unknown as ExtendableEvent);

            await waitUntil.mock.results[0]?.value;

            // Plugins sorted by order (default 0), same order maintains registration order
            expect(order).toEqual(['first', 'fourth', 'second', 'third']);
        });

        it('calls install handlers sorted by order (negative first, then ascending)', async () => {
            const order: string[] = [];
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'mid', install: () => order.push('mid') }, // defaults to order 0
                { name: 'late', order: 1, install: () => order.push('late') },
                { name: 'early', order: -1, install: () => order.push('early') },
                { name: 'last', order: 2, install: () => order.push('last') },
            ];
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            const waitUntil = vi.fn((p: Promise<unknown>) => p);
            handlers.install({ waitUntil } as unknown as ExtendableEvent);
            await waitUntil.mock.results[0]?.value;

            // Sorted by order ascending: -1, 0, 1, 2
            expect(order).toEqual(['early', 'mid', 'late', 'last']);
        });
    });

    describe('install error handling', () => {
        it('calls onError with INSTALL_ERROR when a plugin throws', async () => {
            const onError = vi.fn();
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'failing',
                    install: () => {
                        throw new Error('plugin failed');
                    },
                },
            ];
            const event = { waitUntil: vi.fn((p: Promise<unknown>) => p) };
            const handlers = createEventHandlers(plugins, { version: '1.0.0', onError });

            handlers.install(event as unknown as ExtendableEvent);
            await event.waitUntil.mock.results[0]?.value;

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                event,
                serviceWorkerErrorTypes.INSTALL_ERROR
            );
            expect((onError.mock.calls[0]?.[0] as Error).message).toBe(
                'plugin failed'
            );
        });

        it('calls onError when a plugin rejects', async () => {
            const onError = vi.fn();
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'rejecting',
                    install: () => Promise.reject(new Error('rejected')),
                },
            ];
            const event = { waitUntil: vi.fn((p: Promise<unknown>) => p) };
            const handlers = createEventHandlers(plugins, { version: '1.0.0', onError });

            handlers.install(event as unknown as ExtendableEvent);
            await event.waitUntil.mock.results[0]?.value;

            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                event,
                serviceWorkerErrorTypes.INSTALL_ERROR
            );
        });
    });

    describe('fetch', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it('returns first non-undefined Response from a plugin', async () => {
            const response = new Response('ok');
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', fetch: async () => undefined },
                { name: 'b', fetch: async () => response },
                { name: 'c', fetch: async () => new Response('never') },
            ];
            const respondWith = vi.fn();
            const event = {
                request: new Request('https://example.com/'),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            handlers.fetch(event as unknown as FetchEvent);

            const promise = respondWith.mock.calls[0]?.[0];
            expect(promise).toBeInstanceOf(Promise);
            const result = await promise;
            expect(result).toBe(response);
        });

        it('falls back to fetch(request) when all plugins return undefined', async () => {
            const fetchResponse = new Response('from network');
            const globalFetch = vi.fn().mockResolvedValue(fetchResponse);
            vi.stubGlobal('fetch', globalFetch);

            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', fetch: async () => undefined },
                { name: 'b', fetch: async () => undefined },
            ];
            const request = new Request('https://example.com/');
            const respondWith = vi.fn();
            const event = { request, respondWith };
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            handlers.fetch(event as unknown as FetchEvent);

            const result = await respondWith.mock.calls[0]?.[0];
            expect(result).toBe(fetchResponse);
            expect(globalFetch).toHaveBeenCalledWith(request);
        });

        it('passes passthroughHeader to plugin context (default)', () => {
            let receivedHeader: string | undefined;
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'a',
                    fetch: async (_event, context) => {
                        receivedHeader = context.passthroughHeader;
                        return undefined;
                    },
                },
            ];
            const respondWith = vi.fn((p: Promise<unknown>) => p);
            const globalFetch = vi.fn().mockResolvedValue(new Response('ok'));
            vi.stubGlobal('fetch', globalFetch);
            const event = {
                request: new Request('https://example.com/'),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            handlers.fetch(event as unknown as FetchEvent);

            return respondWith.mock.results[0]?.value.then(() => {
                expect(receivedHeader).toBe(PSW_PASSTHROUGH_HEADER);
            });
        });

        it('passes custom passthroughHeader to plugin context', () => {
            let receivedHeader: string | undefined;
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'a',
                    fetch: async (_event, context) => {
                        receivedHeader = context.passthroughHeader;
                        return undefined;
                    },
                },
            ];
            const respondWith = vi.fn((p: Promise<unknown>) => p);
            const globalFetch = vi.fn().mockResolvedValue(new Response('ok'));
            vi.stubGlobal('fetch', globalFetch);
            const event = {
                request: new Request('https://example.com/'),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, {
                version: '1.0.0',
                passthroughRequestHeader: 'X-My-Internal',
            });

            handlers.fetch(event as unknown as FetchEvent);

            return respondWith.mock.results[0]?.value.then(() => {
                expect(receivedHeader).toBe('X-My-Internal');
            });
        });

        it('skips respondWith for request with default passthrough header (no option set)', () => {
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', fetch: async () => new Response('should not reach') },
            ];
            const respondWith = vi.fn();
            const event = {
                request: new Request('https://example.com/', {
                    headers: { [PSW_PASSTHROUGH_HEADER]: '1' },
                }),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            handlers.fetch(event as unknown as FetchEvent);

            expect(respondWith).not.toHaveBeenCalled();
        });

        it('skips respondWith for request matching custom passthroughRequestHeader string', () => {
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', fetch: async () => new Response('should not reach') },
            ];
            const respondWith = vi.fn();
            const event = {
                request: new Request('https://example.com/', {
                    headers: { 'X-My-Internal': '1' },
                }),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, {
                version: '1.0.0',
                passthroughRequestHeader: 'X-My-Internal',
            });

            handlers.fetch(event as unknown as FetchEvent);

            expect(respondWith).not.toHaveBeenCalled();
        });

        it('processes request normally when no passthrough header is present', async () => {
            const response = new Response('ok');
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', fetch: async () => response },
            ];
            const respondWith = vi.fn();
            const event = {
                request: new Request('https://example.com/'),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, {
                version: '1.0.0',
                passthroughRequestHeader: 'X-My-Internal',
            });

            handlers.fetch(event as unknown as FetchEvent);

            expect(respondWith).toHaveBeenCalled();
            expect(await respondWith.mock.calls[0]?.[0]).toBe(response);
        });

        it('calls onError when a plugin throws and continues to next', async () => {
            const onError = vi.fn();
            const response = new Response('ok');
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'throws',
                    fetch: async () => {
                        throw new Error('oops');
                    },
                },
                { name: 'returns', fetch: async () => response },
            ];
            const respondWith = vi.fn();
            const event = {
                request: new Request('https://example.com/'),
                respondWith,
            };
            const handlers = createEventHandlers(plugins, { version: '1.0.0', onError });

            handlers.fetch(event as unknown as FetchEvent);

            const result = await respondWith.mock.calls[0]?.[0];
            expect(result).toBe(response);
            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                event,
                serviceWorkerErrorTypes.FETCH_ERROR
            );
        });
    });

    describe('message', () => {
        it('calls all message handlers with the event', () => {
            const calls: unknown[] = [];
            const plugins: ServiceWorkerPlugin[] = [
                { name: 'a', message: (ev) => calls.push(['a', ev]) },
                { name: 'b', message: (ev) => calls.push(['b', ev]) },
            ];
            const event = { data: { type: 'test' } } as unknown as Parameters<
                ReturnType<typeof createEventHandlers>['message']
            >[0];
            const handlers = createEventHandlers(plugins, { version: '1.0.0' });

            handlers.message(event);

            expect(calls).toHaveLength(2);
            expect(calls[0]).toEqual(['a', event]);
            expect(calls[1]).toEqual(['b', event]);
        });

        it('calls onError when a message handler throws', () => {
            const onError = vi.fn();
            const plugins: ServiceWorkerPlugin[] = [
                {
                    name: 'throws',
                    message: () => {
                        throw new Error('message error');
                    },
                },
            ];
            const event = { data: { type: 'test' } } as unknown as Parameters<
                ReturnType<typeof createEventHandlers>['message']
            >[0];
            const handlers = createEventHandlers(plugins, { version: '1.0.0', onError });

            handlers.message(event);

            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                event,
                serviceWorkerErrorTypes.MESSAGE_ERROR_HANDLER
            );
        });
    });

    describe('global error handlers', () => {
        it('calls onError with ERROR type for error event', () => {
            const onError = vi.fn();
            const err = new Error('runtime error');
            const event = { error: err } as unknown as ErrorEvent;
            const handlers = createEventHandlers([], { version: '1.0.0', onError });

            handlers.error(event);

            expect(onError).toHaveBeenCalledWith(
                err,
                event,
                serviceWorkerErrorTypes.ERROR
            );
        });

        it('calls onError with MESSAGE_ERROR type for messageerror event', () => {
            const onError = vi.fn();
            const event = { data: 'bad data' } as unknown as MessageEvent;
            const handlers = createEventHandlers([], { version: '1.0.0', onError });

            handlers.messageerror(event);

            expect(onError).toHaveBeenCalledWith(
                'bad data',
                event,
                serviceWorkerErrorTypes.MESSAGE_ERROR
            );
        });

        it('calls onError with UNHANDLED_REJECTION type for unhandledrejection', () => {
            const onError = vi.fn();
            const reason = new Error('unhandled');
            const event = { reason } as unknown as PromiseRejectionEvent;
            const handlers = createEventHandlers([], { version: '1.0.0', onError });

            handlers.unhandledrejection(event);

            expect(onError).toHaveBeenCalledWith(
                reason,
                event,
                serviceWorkerErrorTypes.UNHANDLED_REJECTION
            );
        });
    });
});
