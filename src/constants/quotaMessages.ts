/** Message type: SW reports that a cache write failed due to insufficient storage. */
export const SW_QUOTA_EXCEEDED = 'SW_QUOTA_EXCEEDED';

export const QuotaExceededPhase = {
    INSTALL: 'install',
    RUNTIME: 'runtime',
} as const;
export type QuotaExceededPhase =
    (typeof QuotaExceededPhase)[keyof typeof QuotaExceededPhase];

export interface QuotaExceededMessage {
    type: typeof SW_QUOTA_EXCEEDED;
    phase: QuotaExceededPhase;
}
