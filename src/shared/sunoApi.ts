import { STUDIO_API_BASE } from './config';
import { logger } from './logger';

export interface AlignedWord {
    word: string;
    start_s: number;
}

/** Outcome of a network call where the caller needs the HTTP status to classify
 * failures (401 vs 404 vs network throw). `status` is 0 when the request threw. */
export interface FetchResult<T> {
    data: T | null;
    status: number;
    threw: boolean;
}

/**
 * Fetches time-aligned lyrics for a song using a bearer token. Surfaces the HTTP
 * status so the caller can distinguish an expired session from an inaccessible song.
 */
export async function fetchAlignedWordsWithToken(
    songId: string,
    bearerToken: string
): Promise<FetchResult<AlignedWord[]>> {
    try {
        const response = await fetch(`${STUDIO_API_BASE}/${songId}/aligned_lyrics/v2/`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) return { data: null, status: response.status, threw: false };
        const data = await response.json();
        const words: AlignedWord[] | null =
            data.aligned_words && data.aligned_words.length ? data.aligned_words : null;
        return { data: words, status: response.status, threw: false };
    } catch (e) {
        logger.warn('Aligned-lyrics request threw:', e);
        return { data: null, status: 0, threw: true };
    }
}

/**
 * Credentialed GET of the public song page HTML. The popup carries the Suno
 * host permissions, so this cross-origin fetch is allowed and includes the
 * session cookie. Returns the HTML text plus status for error classification.
 */
export async function fetchSongPageHtml(songId: string): Promise<FetchResult<string>> {
    try {
        const response = await fetch(`https://suno.com/song/${songId}`, { credentials: 'include' });
        if (!response.ok) return { data: null, status: response.status, threw: false };
        return { data: await response.text(), status: response.status, threw: false };
    } catch (e) {
        logger.warn('Song-page fetch threw:', e);
        return { data: null, status: 0, threw: true };
    }
}
