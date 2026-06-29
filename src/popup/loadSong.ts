// Popup-orchestrated song load. Runs entirely with the popup's extension
// privileges (host_permissions + chrome.cookies via the background broker) — no
// active Suno tab and no content script required. Given a SongRef it reads the
// session token, fetches aligned lyrics, fetches+parses the song-page metadata,
// and assembles the SongModel the loaded views already consume.

import { CDN_BASE } from '../shared/config';
import { alignedWordsToLrc } from '../shared/lrc';
import { classifyLoadError } from '../shared/loadError';
import { parseSongMetadata } from '../shared/songMetadata';
import { fetchAlignedWordsWithToken, fetchSongPageHtml } from '../shared/sunoApi';
import { getBearerTokenFromBrowser, makeCandidateId } from '../shared/tokenDiscovery';
import type { LoadError, SongRef, TokenCandidate, TokenOption } from '../shared/types';
import type { SongModel } from './song';
import { anySunoTabOpen } from './sunoTabs';
import { mintFreshToken } from './tokenRefresh';

export interface LoadSuccess {
    ok: true;
    song: SongModel;
    tokenOptions: TokenOption[];
    tokenSelectedId: string;
}
export interface LoadFailure {
    ok: false;
    error: LoadError;
    tokenOptions: TokenOption[];
    tokenSelectedId: string;
}
export type LoadOutcome = LoadSuccess | LoadFailure;

/** Orders candidates to try, honouring an explicit manual selection. */
function candidatesToTry(candidates: TokenCandidate[], selectedId: string): TokenCandidate[] {
    let list = candidates.slice();
    if (selectedId !== 'auto') {
        const found = candidates.find((c) => makeCandidateId(c) === selectedId);
        list = found ? [found] : candidates.slice();
    }
    const seen = new Set<string>();
    return list.filter((c) => {
        const id = makeCandidateId(c);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

/** Fetches + parses the song page into the loaded-view SongModel. Metadata
 * failure is non-fatal — falls back to CDN-pattern URLs so the song still loads. */
async function assembleSong(ref: SongRef, lrcContent: string): Promise<SongModel> {
    const { songId } = ref;
    const htmlRes = await fetchSongPageHtml(songId);
    const meta = parseSongMetadata(htmlRes.data || '', songId);
    return {
        songId,
        title: meta.title || 'Unknown Title',
        artist: meta.artist || 'Unknown Artist',
        lrcContent,
        image: meta.mediaUrls.image || undefined,
        video: meta.mediaUrls.video || undefined,
        audio: meta.mediaUrls.audio || `${CDN_BASE}/${songId}.mp3`,
        duration: meta.duration,
        model: meta.model,
        source: ref.source
    };
}

/** Loads a song end-to-end for the given reference. */
export async function loadSong(ref: SongRef, tokenOptionId = 'auto'): Promise<LoadOutcome> {
    const selected = tokenOptionId || 'auto';
    const { candidates, options } = await getBearerTokenFromBrowser();

    let lastStatus = 0;
    let threw = false;
    for (const cand of candidatesToTry(candidates, selected)) {
        const res = await fetchAlignedWordsWithToken(ref.songId, cand.token);
        if (res.threw) {
            threw = true;
            continue;
        }
        lastStatus = res.status;
        if (res.data && res.data.length) {
            const song = await assembleSong(ref, alignedWordsToLrc(res.data));
            return { ok: true, song, tokenOptions: options, tokenSelectedId: selected };
        }
    }

    // Stale session: mint a fresh token from a live Suno tab and retry once (US3).
    const refreshAvailable = await anySunoTabOpen();
    if (lastStatus === 401 && refreshAvailable) {
        const fresh = await mintFreshToken();
        if (fresh) {
            const res = await fetchAlignedWordsWithToken(ref.songId, fresh);
            if (res.data && res.data.length) {
                const song = await assembleSong(ref, alignedWordsToLrc(res.data));
                return { ok: true, song, tokenOptions: options, tokenSelectedId: selected };
            }
            if (!res.threw) lastStatus = res.status;
        }
    }

    const error = classifyLoadError({
        parsedSongId: ref.songId,
        candidateCount: candidates.length,
        lastStatus,
        threw,
        refreshAvailable
    });
    return { ok: false, error, tokenOptions: options, tokenSelectedId: selected };
}
