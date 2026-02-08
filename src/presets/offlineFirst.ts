import type { RequiredOptions } from '../index.js';

import { precache } from '../plugins/precache.js';
import { serveFromCache } from '../plugins/serveFromCache.js';

/** Пресет: precache при install + отдача из кеша в fetch (при промахе — сеть через фреймворк). */
export const offlineFirst = [precache, serveFromCache] as const;

/** Контекст, требуемый пресетом offlineFirst (выводится из плагинов). */
export type OfflineFirstContext = RequiredOptions<typeof offlineFirst>;
