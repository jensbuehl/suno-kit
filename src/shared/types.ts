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

// --- Popup -> content script -------------------------------------------------

export interface GetLrcDataRequest {
    action: 'GET_LRC_DATA';
    tokenOptionId?: string;
}

export interface LrcDataResponse {
    songId: string | null;
    title?: string;
    artist?: string;
    mediaUrls?: MediaUrls | null;
    duration?: string; // optional, best-effort passthrough
    model?: string; // optional, best-effort passthrough
    tokenDebugPath: string;
    tokenOptions: TokenOption[];
    tokenSelectedId: string;
    lrcContent?: string | null;
    error?: string;
}

// --- Content script -> background --------------------------------------------

export interface GetCookiesRequest {
    action: 'FC_GET_SUNO_COOKIES';
    domains?: string[];
}

export interface GetCookiesResponse {
    cookies: chrome.cookies.Cookie[];
    error?: string;
}
