import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
    SW_QUOTA_EXCEEDED,
    QuotaExceededPhase,
} from '../src/constants/quotaMessages.ts';
import { cacheAddAll } from '../src/utils/cacheAddAll.ts';
import { cachePut } from '../src/utils/cachePut.ts';

function quotaError(): Error {
    const error = new Error('The quota has been exceeded.');
    error.name = 'QuotaExceededError';
    return error;
}

describe('cachePut / cacheAddAll', () => {
    const postMessage = vi.fn();
    const matchAll = vi.fn(async () => [{ postMessage }]);

    beforeEach(() => {
        postMessage.mockReset();
        matchAll.mockClear();
        vi.stubGlobal('self', {
            clients: {
                matchAll,
            },
        });
    });

    describe('cachePut', () => {
        it('writes to cache and does not notify on success', async () => {
            const put = vi.fn(async () => undefined);
            const cache = { put } as unknown as Cache;
            const request = new Request('https://example.com/a.js');
            const response = new Response('ok');

            await expect(cachePut(cache, request, response)).resolves.toBe(
                true
            );
            expect(put).toHaveBeenCalledWith(request, response);
            expect(postMessage).not.toHaveBeenCalled();
        });

        it('notifies uncontrolled clients and returns false on QuotaExceededError', async () => {
            const cache = {
                put: vi.fn(async () => {
                    throw quotaError();
                }),
            } as unknown as Cache;

            await expect(
                cachePut(cache, '/a.js', new Response('ok'))
            ).resolves.toBe(false);

            expect(matchAll).toHaveBeenCalledWith({
                type: 'window',
                includeUncontrolled: true,
            });
            expect(postMessage).toHaveBeenCalledWith({
                type: SW_QUOTA_EXCEEDED,
                phase: QuotaExceededPhase.RUNTIME,
            });
        });

        it('rethrows other errors without notifying', async () => {
            const error = new Error('boom');
            const cache = {
                put: vi.fn(async () => {
                    throw error;
                }),
            } as unknown as Cache;

            await expect(
                cachePut(cache, '/a.js', new Response('ok'))
            ).rejects.toBe(error);
            expect(postMessage).not.toHaveBeenCalled();
        });
    });

    describe('cacheAddAll', () => {
        it('adds all requests and does not notify on success', async () => {
            const addAll = vi.fn(async () => undefined);
            const cache = { addAll } as unknown as Cache;
            const requests = ['https://example.com/a.js'];

            await cacheAddAll(cache, requests);
            expect(addAll).toHaveBeenCalledWith(requests);
            expect(postMessage).not.toHaveBeenCalled();
        });

        it('notifies uncontrolled clients and rethrows on QuotaExceededError', async () => {
            const error = quotaError();
            const cache = {
                addAll: vi.fn(async () => {
                    throw error;
                }),
            } as unknown as Cache;

            await expect(cacheAddAll(cache, ['/a.js'])).rejects.toBe(error);

            expect(matchAll).toHaveBeenCalledWith({
                type: 'window',
                includeUncontrolled: true,
            });
            expect(postMessage).toHaveBeenCalledWith({
                type: SW_QUOTA_EXCEEDED,
                phase: QuotaExceededPhase.INSTALL,
            });
        });

        it('rethrows other errors without notifying', async () => {
            const error = new Error('network');
            const cache = {
                addAll: vi.fn(async () => {
                    throw error;
                }),
            } as unknown as Cache;

            await expect(cacheAddAll(cache, ['/a.js'])).rejects.toBe(error);
            expect(postMessage).not.toHaveBeenCalled();
        });
    });
});
