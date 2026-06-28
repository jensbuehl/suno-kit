import { STUDIO_API_BASE } from '../shared/config';
import { logger } from '../shared/logger';

export interface AlignedWord {
    word: string;
    start_s: number;
}

/**
 * Fetches time-aligned lyrics for a song using a bearer token.
 * Returns the aligned words, or null if the request fails or returns none.
 */
export async function fetchAlignedWordsWithToken(
    songId: string,
    bearerToken: string
): Promise<AlignedWord[] | null> {
    try {
        const response = await fetch(`${STUDIO_API_BASE}/${songId}/aligned_lyrics/v2/`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw Error(`API request failed: ${response.status}`);
        const data = await response.json();
        return data.aligned_words && data.aligned_words.length ? data.aligned_words : null;
    } catch (e) {
        logger.warn('Token-Versuch fehlgeschlagen:', e);
        return null;
    }
}
