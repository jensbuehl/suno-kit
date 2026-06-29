// Shared contracts for messages passed between the popup, content script, and
// background service worker. These are the types that were previously only
// enforced "by hope".

export interface MediaUrls {
    image: string;
    video: string;
    audio?: string; // extracted from the embedded Next.js JSON (player / MP3 / ZIP)
}

export interface SongMetadata {
    title: string;
    artist: string;
    mediaUrls: MediaUrls;
    duration?: string; // optional, best-effort from embedded JSON
    model?: string; // optional, best-effort from embedded JSON
}

/** A bearer-token candidate discovered in cookies / localStorage. */
export interface TokenCandidate {
    token: string;
    source: string;
    path: string;
}

/** A selectable token-discovery path shown in the popup dropdown. */
export interface TokenOption {
    id: string;
    label: string;
    index: number;
}

/** Where a resolved song reference originated (drives precedence + messaging). */
export type SongSource = 'paste' | 'active-tab' | 'background-tab';

/** A resolved pointer to one Suno song and where it came from. */
export interface SongRef {
    songId: string;
    source: SongSource;
    sourceUrl?: string;
}

/** Discriminated failure reasons surfaced by the popup-orchestrated load. */
export type LoadError =
    | { kind: 'bad-link' }
    | { kind: 'not-signed-in' }
    | { kind: 'session-expired'; canRefresh: boolean }
    | { kind: 'song-inaccessible' }
    | { kind: 'offline' }
    | { kind: 'unknown'; detail?: string };

// --- Popup -> background ------------------------------------------------------

export interface GetCookiesRequest {
    action: 'FC_GET_SUNO_COOKIES';
    domains?: string[];
}

export interface GetCookiesResponse {
    cookies: chrome.cookies.Cookie[];
    error?: string;
}
