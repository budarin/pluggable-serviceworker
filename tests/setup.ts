import { vi } from 'vitest';
import type { Logger } from '../src/index.ts';

const addEventListener = vi.fn();
let logger: Logger = console;

vi.stubGlobal('self', {
    addEventListener,
    get logger() {
        return logger;
    },
    set logger(value: typeof logger) {
        logger = value;
    },
});
