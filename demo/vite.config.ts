import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Отдаёт precache-URL'ы и /sw.js без редиректа (200 + тело), чтобы ключ в Cache API совпадал с запросом. */
const PRECACHE_PATHS: Record<string, string> = {
    '/': 'index.html',
    '/assets/main.js': 'assets/main.js',
    '/assets/service-worker.js': 'assets/service-worker.js',
};

function swNoCachePlugin(): import('vite').Plugin {
    return {
        name: 'sw-no-cache',
        configurePreviewServer(server) {
            const config = server.config;
            const outDir = config.build?.outDir ?? 'dist';
            const distDir = join(config.root, outDir);

            const handle = async (
                req: import('node:http').IncomingMessage,
                res: import('node:http').ServerResponse,
                next: (err?: unknown) => void
            ) => {
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                const pathname = req.url?.split('?')[0] ?? '';

                if (pathname === '/sw.js') {
                    try {
                        const body = await readFile(join(distDir, 'sw.js'), 'utf-8');
                        const v = Date.now();
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
                        res.end(`// v${v}\n` + body);
                    } catch (err) {
                        console.error('[sw-no-cache]', err);
                        next(err);
                    }
                    return;
                }

                const file = PRECACHE_PATHS[pathname];
                if (!file) return next();

                try {
                    const body = await readFile(join(distDir, file), 'utf-8');
                    const contentType =
                        pathname.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/html; charset=utf-8';
                    res.setHeader('Content-Type', contentType);
                    res.statusCode = 200;
                    res.end(body);
                } catch (err) {
                    next(err);
                }
            };

            const stack = (
                server.middlewares as unknown as {
                    stack: { route: string; handle: unknown }[];
                }
            ).stack;
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
