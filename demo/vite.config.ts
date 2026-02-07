import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** При отдаче /sw.js подмешивает комментарий с меткой времени — тело ответа меняется при каждом запросе. Обработчик в начале цепочки, чтобы статика не отдала файл раньше нас. */
function swNoCachePlugin(): import('vite').Plugin {
    return {
        name: 'sw-no-cache',
        configurePreviewServer(server) {
            const config = server.config;
            const outDir = config.build?.outDir ?? 'dist';
            const swPath = join(config.root, outDir, 'sw.js');

            const handle = async (
                req: import('node:http').IncomingMessage,
                res: import('node:http').ServerResponse,
                next: (err?: unknown) => void
            ) => {
                const pathname = req.url?.split('?')[0] ?? '';
                if (pathname !== '/sw.js') return next();

                try {
                    const body = await readFile(swPath, 'utf-8');
                    const v = Date.now();
                    const versionComment = `// v${v}\n`;
                    res.setHeader(
                        'Content-Type',
                        'application/javascript; charset=utf-8'
                    );
                    res.setHeader(
                        'Cache-Control',
                        'no-store, no-cache, must-revalidate'
                    );
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.setHeader('ETag', `"sw-${v}"`);
                    res.end(versionComment + body);
                } catch (err) {
                    console.error('[sw-no-cache]', err);
                    next(err);
                }
            };

            const stack = (server.middlewares as unknown as { stack: { route: string; handle: unknown }[] }).stack;
            stack.unshift({ route: '', handle });
        },
    };
}

export default defineConfig({
    plugins: [react(), swNoCachePlugin()],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                sw: 'src/sw.ts',
            },
            output: {
                entryFileNames: (chunkInfo) =>
                    chunkInfo.name === 'sw' ? 'sw.js' : 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name][extname]',
            },
        },
        target: 'esnext',
        sourcemap: false,
    },
});
