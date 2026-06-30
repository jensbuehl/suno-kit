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
import { getBearerTokenFromBrowser } from '../shared/tokenDiscovery';
import type { LoadError, SongRef, TokenCandidate } from '../shared/types';
import type { SongModel } from './song';
import { anySunoTabOpen } from './sunoTabs';
import { mintFreshToken } from './tokenRefresh';

export interface LoadSuccess {
    ok: true;
    song: SongModel;
}
export interface LoadFailure {
    ok: false;
    error: LoadError;
}
export type LoadOutcome = LoadSuccess | LoadFailure;

/** De-duplicates candidates by token (the session cookie is commonly seen on
 *  multiple domains) so "Auto" doesn't try the same token twice. */
function uniqueByToken(candidates: TokenCandidate[]): TokenCandidate[] {
    const seen = new Set<string>();
    return candidates.filter((c) => {
        if (seen.has(c.token)) return false;
        seen.add(c.token);
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

/** Loads a song end-to-end for the given reference. "Auto" tries every discovered
 *  session token and, on a stale 401, mints a fresh one from a live Suno tab. */
export async function loadSong(ref: SongRef): Promise<LoadOutcome> {
    const candidates = await getBearerTokenFromBrowser();

    let lastStatus = 0;
    let threw = false;
    for (const cand of uniqueByToken(candidates)) {
        const res = await fetchAlignedWordsWithToken(ref.songId, cand.token);
        if (res.threw) {
            // A network failure/timeout won't differ across tokens — stop retrying
            // (otherwise N stalled tokens stack N timeouts).
            threw = true;
            break;
        }
        lastStatus = res.status;
        if (res.data && res.data.length) {
            return { ok: true, song: await assembleSong(ref, alignedWordsToLrc(res.data)) };
        }
    }

    // Stale session: mint a fresh token from a live Suno tab and retry once.
    const refreshAvailable = await anySunoTabOpen();
    if (lastStatus === 401 && refreshAvailable) {
        const fresh = await mintFreshToken();
        if (fresh) {
            const res = await fetchAlignedWordsWithToken(ref.songId, fresh);
            if (res.data && res.data.length) {
                return { ok: true, song: await assembleSong(ref, alignedWordsToLrc(res.data)) };
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
    return { ok: false, error };
}
