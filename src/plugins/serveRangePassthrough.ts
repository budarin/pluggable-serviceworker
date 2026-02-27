import type { Plugin } from '../index.js';

export interface ServeRangePassthroughConfig {
    order?: number;
}

/**
 * Для запросов с заголовком Range, которые не обработали плагины Range-кэша или Range-OPFS,
 * выполняет запрос на сервер через fetchPassthrough.
 * Передаёт event.request как есть, чтобы при отмене запроса браузером запрос к серверу тоже прерывался.
 */
export function serveRangePassthrough(
    config: ServeRangePassthroughConfig = {}
): Plugin {
    const { order = 0 } = config;

    return {
        order,
        name: 'serveRangePassthrough',

        fetch: async (event, context) => {
            if (!event.request.headers.has('Range')) {
                return undefined;
            }

            return context.fetchPassthrough(event.request);
        },
    };
}
