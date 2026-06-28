import type { GetLrcDataRequest, LrcDataResponse, TokenCandidate } from '../shared/types';
import { extractSongMetadata } from './metadata';
import { fetchAlignedWordsWithToken } from './sunoApi';
import { alignedWordsToLrc } from './lrc';
import { formatPathResult, getBearerTokenFromBrowser, makeCandidateId } from './tokenDiscovery';

/** Resolves LRC data for the current song, trying token candidates in turn. */
async function getLrcData(preferredOptionId?: string): Promise<LrcDataResponse> {
    const songId = window.location.pathname.split('/').pop() || '';
    const preferredId = typeof preferredOptionId === 'string' && preferredOptionId ? preferredOptionId : 'auto';

    if (!songId) {
        console.error('Could not extract song ID from URL');
        return {
            songId: null,
            lrcContent: null,
            tokenDebugPath: 'NO_TOKEN',
            tokenOptions: [],
            tokenSelectedId: preferredId
        };
    }

    const metadata = extractSongMetadata();
    const { candidates, options, indexById } = await getBearerTokenFromBrowser();
    let tokenDebugPath = 'Konnte kein Token finden';

    // Build the list of candidates to try, honouring an explicit selection.
    let candidatesToTry: TokenCandidate[] = [];
    if (candidates.length) {
        if (preferredId !== 'auto') {
            const found = candidates.find((c) => makeCandidateId(c) === preferredId);
            candidatesToTry = found ? [found] : candidates.slice();
        } else {
            candidatesToTry = candidates.slice();
        }
    }
    if (candidatesToTry.length > 1) {
        const seen: Record<string, boolean> = {};
        candidatesToTry = candidatesToTry.filter((c) => {
            const id = makeCandidateId(c);
            if (seen[id]) return false;
            seen[id] = true;
            return true;
        });
    }

    // Auto: use the first path that actually returns lyrics.
    for (const candidate of candidatesToTry) {
        const alignedWords = await fetchAlignedWordsWithToken(songId, candidate.token);
        if (!alignedWords || !alignedWords.length) continue;

        const chosenId = makeCandidateId(candidate);
        const chosenIdx = indexById[chosenId] || '?';
        tokenDebugPath = formatPathResult(`Weg ${chosenIdx}`, candidate.source, candidate.token);

        return {
            songId,
            title: metadata.title,
            artist: metadata.artist,
            mediaUrls: metadata.mediaUrls,
            tokenDebugPath,
            tokenOptions: options,
            tokenSelectedId: preferredId,
            lrcContent: alignedWordsToLrc(alignedWords)
        };
    }

    if (options.length) {
        tokenDebugPath =
            preferredId === 'auto'
                ? 'Auto: Kein Weg hat Lyrics geliefert'
                : 'Auswahl: Kein Weg hat Lyrics geliefert';
    }

    return {
        songId,
        title: metadata.title,
        artist: metadata.artist,
        mediaUrls: metadata.mediaUrls,
        tokenDebugPath,
        tokenOptions: options,
        tokenSelectedId: preferredId,
        lrcContent: null
    };
}

chrome.runtime.onMessage.addListener((request: GetLrcDataRequest, _sender, sendResponse) => {
    if (request.action === 'GET_LRC_DATA') {
        if (window.location.pathname.startsWith('/song/')) {
            getLrcData(request.tokenOptionId).then(sendResponse);
            return true; // keep the channel open for the async response
        }
        sendResponse({
            songId: null,
            lrcContent: null,
            mediaUrls: null,
            tokenDebugPath: 'NO_TOKEN',
            tokenOptions: [],
            tokenSelectedId: 'auto',
            error: 'Not on a song page'
        } satisfies LrcDataResponse);
    }
    return false;
});
