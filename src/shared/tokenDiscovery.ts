import { logger } from './logger';
import type { GetCookiesResponse, TokenCandidate } from './types';

// Tab-independent bearer-token discovery. Reads the signed-in Suno session from
// the browser cookie jar via the background `chrome.cookies` broker — this works
// from the popup regardless of the active tab and can see HttpOnly cookies.
// (Earlier page-context strategies that scraped document.cookie / localStorage
// were removed: they needed a live Suno DOM and only re-found the same tokens.)

/** Heuristic JWT detection: three dot-separated base64url segments. */
export function isLikelyJwt(str: unknown): str is string {
    if (!str || typeof str !== 'string') return false;
    const token = str.trim();
    return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
}

/** Asks the background worker for cookies (including HttpOnly ones). Falls back
 * to an empty list if the worker doesn't answer in time, so it can't hang. */
function getCookiesViaExtension(domains: string[]): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (cookies: chrome.cookies.Cookie[]): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(cookies);
        };
        const timer = setTimeout(() => {
            logger.warn('Cookie broker timed out');
            finish([]);
        }, 5000);
        try {
            chrome.runtime.sendMessage(
                { action: 'FC_GET_SUNO_COOKIES', domains },
                (response: GetCookiesResponse) => {
                    if (chrome.runtime.lastError || !response || !Array.isArray(response.cookies)) {
                        logger.warn('Could not read cookies via chrome.cookies', chrome.runtime.lastError);
                        return finish([]);
                    }
                    finish(response.cookies);
                }
            );
        } catch (err) {
            logger.warn('Failed requesting cookies via background', err);
            finish([]);
        }
    });
}

/** Collects bearer-token candidates from the Suno session cookies (via the
 *  background broker). The caller ("Auto") tries each until one works. */
export async function getBearerTokenFromBrowser(): Promise<TokenCandidate[]> {
    const candidates: TokenCandidate[] = [];

    const cookieApiList = await getCookiesViaExtension(['auth.suno.com', '.suno.com', 'suno.com']);
    try {
        for (const c of cookieApiList) {
            if (!c || !c.name) continue;
            const nameLower = c.name.toLowerCase();
            if (
                c.name === '__client' ||
                c.name.indexOf('__client') === 0 ||
                nameLower.indexOf('session') !== -1
            ) {
                if (isLikelyJwt(c.value)) {
                    candidates.push({
                        token: c.value.trim(),
                        source: `${c.domain || 'auth.suno.com'}/${c.name}`
                    });
                }
            }
        }
    } catch (e) {
        logger.warn('Failed reading chrome.cookies for bearer token', e);
    }

    if (!candidates.length) {
        logger.warn('No JWT candidate found in the cookie jar');
    }

    return candidates;
}
