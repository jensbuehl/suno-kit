# Phase 1 Contracts — Messages & Pure Helpers

This feature is **popup-orchestrated**, so most "contracts" are pure-function signatures
the popup calls directly, plus the one reused runtime message and one on-demand injection.

## 1. Reused runtime message — `FC_GET_SUNO_COOKIES` (unchanged)

Popup → background service worker. Already implemented in `background/index.ts`.

```ts
// request
{ action: 'FC_GET_SUNO_COOKIES'; domains?: string[] }
// response
{ cookies: chrome.cookies.Cookie[]; error?: string }
```

Default domains: `['suno.com', '.suno.com', 'auth.suno.com']`. The popup uses this exactly
as the content script did (the existing `getCookiesViaExtension` helper moves to
`shared/tokenDiscovery.ts`). **No change to the broker.**

## 2. Pure helper — `parseSongId` (new, `shared/songUrl.ts`)

```ts
/** Returns the song id for a valid Suno song link or bare id, else null. */
export function parseSongId(input: string): string | null;
```

Accepts: `https://suno.com/song/<id>`, with/without `www`, query, hash, trailing slash;
`http`/`https`; a bare `<id>` matching the id charset. Rejects: profile/playlist/home/
search URLs, non-Suno hosts, empty/whitespace. **Must not throw.**

## 3. Pure helper — `parseSongMetadata` (new, `shared/songMetadata.ts`)

```ts
/** DOM-free extraction from fetched song-page HTML (reuses metadata.ts Method 4). */
export function parseSongMetadata(html: string, songId: string): SongMetadata;
```

Pulls `og:title`/title→artist, `og:image`/`og:video`/`og:*`, description→artist, and the
streamed `self.__next_f.push("… audio_url … duration … model …")` chunks. Applies the
existing CDN-pattern fallback for any field left empty. Never throws (returns best-effort).

## 4. Pure helper — `classifyLoadError` (new, `shared/loadError.ts`)

```ts
export interface LoadErrorCtx {
  parsedSongId: string | null;     // null ⇒ bad-link
  candidateCount: number;          // 0 ⇒ not-signed-in
  lastStatus?: number;             // HTTP status of the failing request
  threw?: boolean;                 // fetch/network exception ⇒ offline
  refreshAvailable: boolean;       // any Suno tab open to mint a fresh token?
}
export function classifyLoadError(ctx: LoadErrorCtx): LoadError;
```

Deterministic mapping per `data-model.md`. Pure + unit-tested.

## 5. Reused API call — `fetchAlignedWordsWithToken` (moved, unchanged)

```ts
export function fetchAlignedWordsWithToken(
  songId: string, bearerToken: string
): Promise<AlignedWord[] | null>;
```

Now also returns/propagates the HTTP status to the orchestrator so `classifyLoadError` can
distinguish 401 vs 404 (minimal addition: surface status, e.g. via a thrown typed error or
a `{ words, status }` result — implementation detail for the plan, contract is "status is observable").

## 6. New API helper — `fetchSongPageHtml` (new, `shared/sunoApi.ts`)

```ts
/** Credentialed GET of the public song page; returns HTML text or throws on network error. */
export function fetchSongPageHtml(songId: string): Promise<string>;
```

Uses `credentials: 'include'`; relies on existing `host_permissions`. Non-OK HTTP is
reported to the orchestrator (drives `song-inaccessible` vs `session-expired`).

## 7. On-demand injection — MAIN-world token mint (new, P3)

Popup → target Suno tab via `chrome.scripting.executeScript`.

```ts
// Injected into world:'MAIN' of an open Suno tab:
async () => (window as any).Clerk?.session ? await (window as any).Clerk.session.getToken() : null
```

Contract: returns a fresh JWT string, or `null` if Clerk/session is unavailable. The popup
selects any tab matching `*://suno.com/*`, prefers a `/song/*` tab, and retries the load
once with the returned token. No persistent content script required; gated to the
`session-expired` path only.

## 8. Orchestration — `loadSong` (new, `popup/loadSong.ts`)

```ts
export async function loadSong(
  ref: SongRef, tokenOptionId?: string
): Promise<{ ok: true; result: SongResult } | { ok: false; error: LoadError }>;
```

Steps: discover cookies (msg #1) → build candidates → try `aligned_lyrics` (helper #5) →
on success fetch+parse metadata (helpers #6, #3) → assemble `SongResult`; on auth failure
attempt mint+retry (#7) when available, else classify (#4) and return the error.
