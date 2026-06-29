import { logger } from './logger';
import type { GetCookiesResponse, TokenCandidate, TokenOption } from './types';

// Tab-independent bearer-token discovery. Reads the signed-in Suno session from
// the browser cookie jar via the background `chrome.cookies` broker — this works
// from the popup regardless of the active tab and can see HttpOnly cookies. The
// old page-context paths (document.cookie, localStorage) are gone: they required
// a live Suno DOM and only ever rediscovered the same tokens this path returns.

export interface TokenDiscoveryResult {
    candidates: TokenCandidate[];
    options: TokenOption[];
    indexById: Record<string, number>;
}

/** Heuristic JWT detection: three dot-separated base64url segments. */
export function isLikelyJwt(str: unknown): str is string {
    if (!str || typeof str !== 'string') return false;
    const token = str.trim();
    return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
}

/** Stable identifier for a candidate, used as the dropdown option value. */
export function makeCandidateId(candidate: TokenCandidate): string {
    return `${candidate.path || 'Weg ?'}|${candidate.source || 'unknown'}`;
}

/**
 * Human-readable, English description of where a token came from — shown in the
 * manual token-source fallback so the user understands each alternative.
 */
export function describeCandidate(candidate: TokenCandidate): string {
    const src = candidate.source || '';
    if (src.startsWith('cookie-api:')) {
        const name = src.split('/').pop() || 'session';
        return `Browser session cookie (${name})`;
    }
    if (src.startsWith('cookie:')) {
        return `Page cookie (${src.slice('cookie:'.length)})`;
    }
    if (src.startsWith('localStorage:')) {
        const key = src.slice('localStorage:'.length);
        return `Local storage (${key.toLowerCase().includes('clerk') ? 'Clerk session' : key})`;
    }
    return src || 'Discovered token';
}

/** Asks the background worker for cookies (including HttpOnly ones). */
function getCookiesViaExtension(domains: string[]): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(
                { action: 'FC_GET_SUNO_COOKIES', domains },
                (response: GetCookiesResponse) => {
                    if (chrome.runtime.lastError || !response || !Array.isArray(response.cookies)) {
                        logger.warn('Could not read cookies via chrome.cookies', chrome.runtime.lastError);
                        return resolve([]);
                    }
                    resolve(response.cookies);
                }
            );
        } catch (err) {
            logger.warn('Failed requesting cookies via background', err);
            resolve([]);
        }
    });
}

/**
 * Collects bearer-token candidates from the cookie jar (via the background
 * broker) and builds the selectable option list for the popup.
 */
export async function getBearerTokenFromBrowser(): Promise<TokenDiscoveryResult> {
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
                        source: `cookie-api:${c.domain || 'auth.suno.com'}/${c.name}`,
                        path: 'Weg 1'
                    });
                }
            }
        }
    } catch (e) {
        logger.warn('Failed reading chrome.cookies for bearer token', e);
    }

    // Merge candidates that resolve to the SAME token (the session cookie is
    // commonly seen on multiple domains) into one descriptive option each.
    const options: TokenOption[] = [];
    const indexById: Record<string, number> = {};
    const tokenToIndex = new Map<string, number>();
    for (const candidate of candidates) {
        const id = makeCandidateId(candidate);
        let index = tokenToIndex.get(candidate.token);
        if (index === undefined) {
            index = options.length + 1;
            tokenToIndex.set(candidate.token, index);
            options.push({ id, label: describeCandidate(candidate), index });
        }
        if (!indexById[id]) indexById[id] = index;
    }

    if (!candidates.length) {
        logger.warn('No JWT candidate found in the cookie jar');
    }

    return { candidates, options, indexById };
}
