import { QuotaExceededPhase } from '../constants/quotaMessages.js';

import { isQuotaExceededError } from './isQuotaExceededError.js';
import { notifyQuotaExceeded } from './notifyQuotaExceeded.js';

/**
 * Cache.put с обработкой QuotaExceededError: уведомляет клиентов и возвращает false,
 * не пробрасывая ошибку — сетевой ответ уже есть, его нужно отдать странице.
 */
export async function cachePut(
    cache: Cache,
    request: RequestInfo,
    response: Response
): Promise<boolean> {
    try {
        await cache.put(request, response);
        return true;
    } catch (error) {
        if (isQuotaExceededError(error)) {
            await notifyQuotaExceeded(QuotaExceededPhase.RUNTIME);
            return false;
        }

        throw error;
    }
}
