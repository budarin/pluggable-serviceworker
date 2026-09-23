import {
    PLUGGABLE_SW_QUOTA_EXCEEDED,
    type QuotaExceededPhase,
} from '../constants/quotaMessages.js';

import { notifyClients } from './notifyClients.js';

/**
 * Сообщает всем окнам (включая неконтролируемые) о нехватке места при записи в кэш.
 * includeUncontrolled: true — страница слышит сообщение и при первой установке SW.
 */
export async function notifyQuotaExceeded(
    phase: QuotaExceededPhase
): Promise<void> {
    await notifyClients(PLUGGABLE_SW_QUOTA_EXCEEDED, { phase }, true);
}
