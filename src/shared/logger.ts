import { DEBUG } from './config';

/**
 * Logging helper. `debug` and `warn` are silenced unless DEBUG is enabled, so
 * production stays quiet; `error` always logs.
 */
export const logger = {
    debug: (...args: unknown[]): void => {
        if (DEBUG) console.debug(...args);
    },
    warn: (...args: unknown[]): void => {
        if (DEBUG) console.warn(...args);
    },
    error: (...args: unknown[]): void => {
        console.error(...args);
    }
};
