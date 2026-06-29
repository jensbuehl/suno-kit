# Phase 0 Research — Tab-Independent Song Loading & Paste-a-Link

## R1. Where do credentials come from without an active Suno tab?

**Decision**: Read the session JWT from the browser cookie jar via `chrome.cookies`
(the existing "Weg 1" path), invoked from the popup through the already-built background
broker `FC_GET_SUNO_COOKIES`. Drop the page-context-only paths (Weg 2 `document.cookie`,
Weg 3 `localStorage`).

**Rationale**: The cookie jar is global and tab-independent; `chrome.cookies.getAll`
reads HttpOnly cookies (`__client`/`__session`) and needs only `host_permissions`, which
are already granted. Weg 2/3 require a live Suno DOM and are exactly what blocks
tab-independence — and they only ever rediscover the same tokens the cookie path already
returns. Removing them is net-simplifying (Constitution I).

**Alternatives considered**: (a) Keep scraping in a content script — rejected, re-couples
to the active tab. (b) Read `chrome.cookies` directly in the popup without the broker —
viable (popup has the `cookies` permission) but duplicates cookie logic; reusing the
broker keeps one implementation (Constitution II).

## R2. Can media metadata be obtained without the live page DOM?

**Decision**: Fetch `https://suno.com/song/{id}` from the popup with credentials and parse
the returned HTML with a **DOM-free** version of `metadata.ts` Method 4 (regex over the
streamed `self.__next_f.push("…")` chunks + `og:*`/description meta). Keep the existing
CDN-pattern values (`{CDN}/{id}.mp3|.mp4|image_{id}.jpeg`) as last-resort fallback.

**Rationale**: Method 4 already extracts `audio_url`, `video_url`, `image_url`, `duration`,
and model from those server-streamed chunks — they exist in the server HTML, not just the
hydrated DOM. The same regex works on a fetched HTML string, so this is a refactor-to-pure
(extract into `shared/songMetadata.ts`) rather than new logic. The popup already does
credentialed cross-origin fetches to Suno hosts (the ZIP/asset path), so CORS/auth are
solved.

**Validation task (implementation)**: Confirm on a real signed-in song that the fetched
HTML contains `audio_url` and og tags; if a particular field is absent server-side, the
CDN fallback or a clip-metadata API call covers it. This is a known low risk, not a blocker.

**Alternatives considered**: (a) Reverse-engineer a clip-metadata JSON API — cleaner shape
but adds a new undocumented endpoint dependency; defer unless HTML proves insufficient.
(b) Inject a content script to scrape the DOM of a background Suno tab — only works when a
tab for that exact song is open; HTML fetch works for any pasted link.

## R3. Lyrics retrieval from the popup

**Decision**: Reuse `fetchAlignedWordsWithToken(songId, token)` + `alignedWordsToLrc`
verbatim, moved to `src/shared/`. The popup calls them directly (it has `host_permissions`
for `studio-api.prod.suno.com`).

**Rationale**: Pure functions, no DOM, already battle-tested. Moving (not copying) keeps a
single source (Constitution II).

## R4. Identifying the target song

**Decision**: Resolve a `SongRef` by precedence: **explicit pasted/dropped link** >
**active Suno song tab** (parse `tab.url`) > **single background Suno song tab**
(`chrome.tabs.query({ url: '*://suno.com/song/*' })`). Multiple background song tabs with
no paste → present a small chooser rather than guess.

**Rationale**: Matches spec FR-008 and the Assumptions precedence. Parsing the id from a
tab URL removes the need to message a content script just to learn the id. `tabs.query`
by URL works under existing `host_permissions` (no broad `tabs` permission needed to match
hosts we already hold).

**Song-link parsing**: `parseSongId(input)` accepts `https://suno.com/song/<id>` (with or
without query/hash, http/https, trailing slash) and a bare `<id>` when unambiguous; returns
`null` for profiles/playlists/home/non-Suno. Pure + unit-tested.

## R5. Token freshness when the cookie token is stale

**Decision**: Baseline uses the cookie token (fresh whenever a Suno tab was recently
active). On a `session-expired` classification, if any Suno tab is open, inject a
MAIN-world snippet (`chrome.scripting.executeScript({ world: 'MAIN' })`) calling
`window.Clerk.session.getToken()`, bridge the result back, and retry once. If **no** Suno
tab is open, route to the graceful reconnect message (US3). No undocumented backend refresh.

**Rationale**: `Clerk.session.getToken()` returns a freshly-signed JWT and is the canonical
refresh; it just needs a live Suno page (not the active one). This is the only added
complexity and is scoped to P3 (Complexity Tracking).

**Alternatives considered**: (a) POST Clerk's `/v1/client/sessions/{sid}/tokens` from the
background — brittle, undocumented, needs session-id discovery; rejected. (b) Auto-open a
Suno tab to refresh — intrusive; the reconnect prompt lets the user decide.

## R6. Distinguishing failure modes (FR-011)

**Decision**: A pure `classifyLoadError(ctx)` maps to: `bad-link` (parse failed),
`not-signed-in` (no token candidates at all), `session-expired` (candidates exist but all
yield 401/403 on a known-good request and no refresh possible), `song-inaccessible`
(404/403 for the specific song while the token otherwise works), `offline` (fetch/network
throw), `unknown` (fallback). Each maps to a distinct i18n string.

**Rationale**: Deterministic, testable, and gives the specific messaging the spec requires.
Perfect 401 disambiguation (expired vs. no-access) isn't always possible from status alone;
the classifier prefers `session-expired` only when refresh is unavailable, else surfaces
`song-inaccessible` — a pragmatic, user-meaningful split.

## R7. Permissions impact (FR-014)

**Decision**: No new permissions. Confirmed sufficient: `host_permissions` (suno hosts +
`https://*/*`) cover credentialed HTML/API fetches and `tabs.query` URL matching;
`cookies`, `scripting`, `activeTab`, `downloads`, `storage` already declared. The content
script entry may be removed from the manifest once the load path no longer uses it.
