import type { GetCookiesResponse, TokenCandidate, TokenOption } from '../shared/types';

export interface TokenDiscoveryResult {
    candidates: TokenCandidate[];
    debug: string;
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

/** Human-readable description of which path a token came from (for debugging). */
export function formatPathResult(pathLabel: string, source: string, token: string): string {
    const suffix = token ? token.slice(-10) : '';
    return `${pathLabel}: Der Cookie stammt aus ${source || 'unbekannt'}${
        token ? ` und endet auf #${suffix}#` : ''
    }`;
}

/** Asks the background worker for cookies (including HttpOnly ones). */
function getCookiesViaExtension(domains: string[]): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(
                { action: 'FC_GET_SUNO_COOKIES', domains },
                (response: GetCookiesResponse) => {
                    if (chrome.runtime.lastError || !response || !Array.isArray(response.cookies)) {
                        console.warn(
                            'Konnte Cookies nicht ueber chrome.cookies abrufen',
                            chrome.runtime.lastError
                        );
                        return resolve([]);
                    }
                    resolve(response.cookies);
                }
            );
        } catch (err) {
            console.warn('Fehler beim Anfordern der Cookies via Background', err);
            resolve([]);
        }
    });
}

/**
 * Collects bearer-token candidates from chrome.cookies, document.cookie, and
 * localStorage, then builds the selectable option list for the popup.
 */
export async function getBearerTokenFromBrowser(): Promise<TokenDiscoveryResult> {
    const candidates: TokenCandidate[] = [];
    const debugText = 'NO_TOKEN';

    // 1) chrome.cookies (incl. HttpOnly) via the background worker
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
        console.warn('Fehler beim Auslesen der chrome.cookies Daten fuer Bearer-Token', e);
    }

    // 2) document.cookie (non-HttpOnly cookies)
    try {
        const cookieString = document.cookie || '';
        if (cookieString) {
            for (const pair of cookieString.split('; ')) {
                const parts = pair.split('=');
                const name = parts.shift() ?? '';
                const value = parts.join('=');
                if (name === '__session' && isLikelyJwt(value)) {
                    candidates.push({ token: value.trim(), source: 'cookie:__session', path: 'Weg 2' });
                }
                if (
                    (name.indexOf('__client') === 0 || name.toLowerCase().indexOf('session') !== -1) &&
                    isLikelyJwt(value)
                ) {
                    candidates.push({ token: value.trim(), source: `cookie:${name}`, path: 'Weg 2' });
                }
            }
        }
    } catch (e) {
        console.warn('Fehler beim Auslesen der Cookies fuer Bearer-Token', e);
    }

    // 3) localStorage entries related to Clerk / Suno auth
    try {
        for (let l = 0; l < localStorage.length; l++) {
            const key = localStorage.key(l);
            if (!key) continue;
            if (
                key.indexOf('clerk') === -1 &&
                key.indexOf('suno') === -1 &&
                key.toLowerCase().indexOf('auth') === -1 &&
                key.toLowerCase().indexOf('session') === -1
            ) {
                continue;
            }

            const raw = localStorage.getItem(key);
            if (!raw) continue;

            if (isLikelyJwt(raw)) {
                candidates.push({ token: raw.trim(), source: `localStorage:${key}`, path: 'Weg 3' });
            }

            try {
                const walk = (node: unknown): void => {
                    if (!node) return;
                    if (typeof node === 'string') {
                        if (isLikelyJwt(node)) {
                            candidates.push({
                                token: node.trim(),
                                source: `localStorage:${key}`,
                                path: 'Weg 3'
                            });
                        }
                    } else if (typeof node === 'object') {
                        for (const prop in node as Record<string, unknown>) {
                            if (!Object.prototype.hasOwnProperty.call(node, prop)) continue;
                            walk((node as Record<string, unknown>)[prop]);
                        }
                    }
                };
                walk(JSON.parse(raw));
            } catch {
                // Not JSON - already handled the raw string above.
            }
        }
    } catch (e) {
        console.warn('Fehler beim Auslesen von localStorage fuer Bearer-Token', e);
    }

    const options: TokenOption[] = [];
    const indexById: Record<string, number> = {};
    for (const candidate of candidates) {
        const id = makeCandidateId(candidate);
        if (indexById[id]) continue;
        indexById[id] = options.length + 1;
        options.push({ id, label: `Weg ${indexById[id]}`, index: indexById[id] });
    }

    if (!candidates.length) {
        console.warn('Kein JWT-Kandidat in Cookies/localStorage gefunden');
    }

    return { candidates, debug: debugText, options, indexById };
}
