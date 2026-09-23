import { QuotaExceededPhase } from '../constants/quotaMessages.js';

import { isQuotaExceededError } from './isQuotaExceededError.js';
import { notifyQuotaExceeded } from './notifyQuotaExceeded.js';

/**
 * Cache.addAll с обработкой QuotaExceededError: уведомляет клиентов и пробрасывает
 * ошибку дальше, чтобы install не завершился с неполным кэшем.
 */
export async function cacheAddAll(
    cache: Cache,
    requests: RequestInfo[]
): Promise<void> {
    try {
        await cache.addAll(requests);
    } catch (error) {
        if (isQuotaExceededError(error)) {
            await notifyQuotaExceeded(QuotaExceededPhase.INSTALL);
        }

        throw error;
    }
}
