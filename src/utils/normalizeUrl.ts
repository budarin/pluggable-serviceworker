/** Нормализует URL (относительный → абсолютный по origin SW) для единообразного сравнения. */
export function normalizeUrl(url: string): string {
    return new URL(url, self.location.origin).href;
}
