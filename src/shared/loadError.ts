import type { LoadError } from './types';

export interface LoadErrorCtx {
    /** null ⇒ the supplied link could not be parsed into a song id. */
    parsedSongId: string | null;
    /** Number of token candidates found in the cookie jar (0 ⇒ not signed in). */
    candidateCount: number;
    /** HTTP status of the failing request, if any. */
    lastStatus?: number;
    /** A fetch/network call threw (⇒ offline / unreachable). */
    threw?: boolean;
    /** Any open Suno tab from which a fresh token could be minted. */
    refreshAvailable: boolean;
}

/** Maps a failed load context to a specific, user-meaningful LoadError. */
export function classifyLoadError(ctx: LoadErrorCtx): LoadError {
    if (ctx.parsedSongId === null) return { kind: 'bad-link' };
    if (ctx.threw) return { kind: 'offline' };
    if (ctx.candidateCount === 0) return { kind: 'not-signed-in' };

    const status = ctx.lastStatus ?? 0;
    if (status === 401) return { kind: 'session-expired', canRefresh: ctx.refreshAvailable };
    if (status === 403 || status === 404) return { kind: 'song-inaccessible' };
    return { kind: 'unknown', detail: status ? `HTTP ${status}` : undefined };
}
