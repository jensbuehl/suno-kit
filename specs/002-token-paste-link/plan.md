# Implementation Plan — Tab-Independent Song Loading & Paste-a-Link

**Branch**: `002-token-paste-link` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-token-paste-link/spec.md`

## Summary

Make the popup work from **any** active tab by sourcing a song from a pasted/dropped
Suno link or a non-active Suno tab, and by obtaining credentials + lyrics + media
metadata **without** a content script running in the active page.

The enabling move is **popup-centric orchestration**: the popup already runs as an
extension page with `host_permissions`, `chrome.cookies`, `chrome.tabs`, and
`chrome.scripting`, and it already performs credentialed cross-origin fetches to Suno
hosts (the ZIP/asset path in `popup.ts`). So the popup can read the session token, call
the `aligned_lyrics` API, and fetch song metadata itself — no active Suno tab, no
content-script round-trip, no active-tab URL dependency. This both **fixes paste-a-link**
(which 001 wired in but left non-functional because `GET_LRC_DATA` had no `songId` field
and resolved the id from `window.location` in the content script) and delivers the
tab-independence the spec asks for.

## Technical Context

**Language/Version**: TypeScript 5.6, ES2022 modules, bundled to IIFE via esbuild (`build.mjs`), `target: chrome114`.

**Primary Dependencies**: None new for the core. Existing runtime dep: `fflate` (ZIP). Reuses `fetchAlignedWordsWithToken`, `alignedWordsToLrc`, the chrome.cookies token path, and the embedded-JSON regex extraction.

**Storage**: None persisted. Credentials are read live per request (constitution III; spec FR-012). The only optionally-remembered value is the user's manual token-source preference (already `tokenSelectedId`), not the credential.

**Testing**: `vitest` (already configured). New pure helpers (`songUrl` parsing, DOM-free metadata parsing, error classification) get unit tests; messaging/orchestration is verified via the quickstart manual matrix.

**Target Platform**: Chrome MV3 extension (`minimum_chrome_version` 114), popup + background service worker. Content script becomes optional (see Structure Decision).

**Project Type**: Browser extension, framework-free vanilla TS. Single source tree under `src/`.

**Performance Goals**: Paste→loaded within a few seconds (SC-001); lyrics fetch is one API call; metadata is one HTML fetch (or reused from a live tab). No perceptible regression to the existing active-tab flow (SC-006).

**Constraints**: No new permissions (FR-014) — `host_permissions` for suno hosts already cover credentialed HTML/API fetches and `tabs.query({url})`; `cookies`, `scripting`, `activeTab`, `downloads`, `storage` already granted. Must not regress the active-Suno-tab zero-input auto-load (FR-007). Credentials never persisted/logged/exported (FR-012).

**Scale/Scope**: Single-user local extension; one popup, one song at a time. ~4–6 small new/edited modules.

## Constitution Check

*GATE: passes before Phase 0 and re-checked after Phase 1.*

- **I. Simplicity & Minimalism** — **PASS, net-simplifying.** Consolidating the load flow into the popup **removes** moving parts: the active-tab content-script round-trip (`GET_LRC_DATA` in `content/index.ts`) and the page-context-only discovery paths (Weg 2 `document.cookie`, Weg 3 `localStorage`) are dropped. One justified addition — on-demand MAIN-world token minting for freshness — is scoped to P3 and recorded in Complexity Tracking.
- **II. Reuse Before Building** — **PASS.** Reuses `fetchAlignedWordsWithToken`, `alignedWordsToLrc`, the chrome.cookies discovery (Weg 1) and its option-building, the embedded-JSON regex from `metadata.ts`, the existing `.icon-btn`/`.topbar-actions` CSS, and all loaded/error views. Shared logic is **moved** into `src/shared/` so popup and (optional) content paths import one copy — no duplication.
- **III. Token & String SSOT** — **PASS.** No new design tokens (the paste control reuses existing ghost-icon-button tokens). All new user-facing copy is added to the single `i18n.ts` map (new keys for paste/link errors and the distinct failure messages of FR-011).
- **IV. State-of-the-Art, Accessible UX** — **PASS via phased rollout (v1.1.0).** Ships the minimal a11y baseline: the paste control and all new actions are keyboard-operable with token-driven visible focus, and every failure mode has immediate, specific feedback (no dead ends — FR-001/011). Full ARIA semantics + contrast/reduced-motion audit are the tracked follow-up, consistent with feature 001's deferred a11y pass.

No unjustified violations → gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/002-token-paste-link/
├── plan.md              # This file
├── research.md          # Phase 0 — feasibility + decisions
├── data-model.md        # Phase 1 — entities & state
├── contracts/
│   └── messages.md      # Phase 1 — message + helper contracts
├── quickstart.md        # Phase 1 — manual QA matrix
└── checklists/
    └── requirements.md  # Spec quality checklist (already present)
```

### Source Code (repository root)

```text
src/
├── shared/
│   ├── songUrl.ts        # NEW — pure: parse/validate a Suno song link → songId
│   ├── songMetadata.ts   # NEW — pure: DOM-free metadata parse from page HTML
│   │                      #        (extracted/reused from content/metadata.ts Method 4)
│   ├── tokenDiscovery.ts # MOVED from content/ — chrome.cookies path only (Weg 1);
│   │                      #        Weg 2/3 removed
│   ├── sunoApi.ts        # MOVED from content/ — fetchAlignedWordsWithToken (+ a
│   │                      #        fetchSongPageHtml helper)
│   ├── lrc.ts            # MOVED from content/ — alignedWordsToLrc (pure)
│   ├── loadError.ts      # NEW — pure: classify a failure into a LoadError kind
│   ├── types.ts          # EDIT — add songId to request; add LoadError/SongRef types
│   ├── config.ts         # (unchanged)
│   └── logger.ts         # (unchanged)
├── popup/
│   ├── popup.ts          # EDIT — orchestrate load: resolve SongRef, read token,
│   │                      #        fetch lyrics+metadata, route to views; new paste flow
│   ├── loadSong.ts       # NEW — the popup-side load orchestration (kept out of popup.ts)
│   ├── songSource.ts     # NEW — resolve SongRef from paste | active tab | bg Suno tab
│   ├── views/
│   │   ├── empty.ts      # EDIT — reinstate a functional paste-a-link input
│   │   └── error.ts      # EDIT — distinct messages per LoadError kind
│   └── … (state.ts, song.ts, i18n.ts EDIT for new strings; others unchanged)
├── background/
│   └── index.ts          # (unchanged) — keeps brokering chrome.cookies for reuse
└── content/
    └── index.ts          # RETIRED for the load path (see Structure Decision)
```

**Structure Decision**: Single `src/` tree, popup-orchestrated. Cross-context pure logic
(token discovery, lyrics fetch, LRC conversion, metadata parse, URL parse, error
classification) lives in `src/shared/` so it is imported by exactly one path (the popup)
and is unit-testable without a DOM. The persistent **content script is retired from the
load flow** — its only unique capability was live-DOM metadata scraping, which is replaced
by a credentialed HTML fetch + the same regex parser. On-demand MAIN-world injection
(`chrome.scripting.executeScript`, P3 freshness) does not require a declared content script.
The background service worker is kept solely as the existing cookie broker (reused, not changed).

## Phase 0 — Research (research.md)

Resolves the two real unknowns before design:

1. **Can media metadata be obtained without the live page?** Validate that a credentialed
   `fetch('https://suno.com/song/{id}')` from the popup returns HTML containing the
   `og:title`/`og:image`/`og:video`, the description (artist), and the streamed
   `self.__next_f.push(... "audio_url" ... "duration" ... model ...)` chunks that
   `metadata.ts` Method 4 already parses. Decide HTML-fetch+regex vs. a clip-metadata API
   call vs. CDN-pattern fallback. (Strong prior: Method 4 parses exactly those server chunks.)
2. **Freshness:** confirm the cookie-jar `__session` JWT is usable when a Suno tab was
   recently alive, and define the on-demand refresh: inject a MAIN-world snippet calling
   `window.Clerk.session.getToken()` into any open Suno tab, bridged back to the popup.
   Decide trigger (401 on a known-good request), tab selection, and the no-tab fallback
   (graceful reconnect — no undocumented backend calls).

Also records the smaller decisions: SongRef precedence, multi-tab disambiguation, and
LoadError → message mapping.

## Phase 1 — Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: `SongRef` (`source`, `songId`, `sourceUrl`), the reused `TokenCandidate`/`TokenOption`, the assembled `SongResult` (same shape the loaded view consumes today), and the `LoadError` discriminated union (`bad-link | not-signed-in | session-expired | song-inaccessible | offline | unknown`). Popup view-state transitions for the new entry points.
- **contracts/messages.md**: the reused `FC_GET_SUNO_COOKIES` broker contract; the new pure-function contracts (`parseSongId`, `parseSongMetadata`, `classifyLoadError`); and the MAIN-world mint injection contract. `GetLrcDataRequest` gains an optional `songId` (kept for any residual content-script use, but the primary path no longer needs it).
- **quickstart.md**: the QA matrix from the spec's scenarios/edge cases (non-Suno active tab + paste; background Suno tab; multi-tab; not-signed-in; expired session with/without a live tab; invalid/non-song link; offline; no regression to active-tab auto-load).

## Implementation Phases (order of operations)

Each slice leaves the extension working.

### Phase A — Extract shared core (no behavior change)
Move `tokenDiscovery.ts` (chrome.cookies path only — delete Weg 2/3), `sunoApi.ts`, and
`lrc.ts` into `src/shared/`. Update imports. Extract `metadata.ts` Method 4 into a pure
`shared/songMetadata.ts` that takes HTML/script-text and returns `SongMetadata`;
`content/metadata.ts` (if still used transitionally) and the new popup path both call it.
Add `shared/songUrl.ts` (`parseSongId`) and `shared/loadError.ts` with unit tests.

### Phase B — Popup-orchestrated load (replaces content-script round-trip)
Add `popup/loadSong.ts`: given a `songId` + `tokenOptionId`, read cookies via the
existing broker, build candidates, try them against `aligned_lyrics`, fetch the song-page
HTML and parse metadata, assemble `SongResult`. Rewire `popup.ts` to call this instead of
`sendLrcRequest`/`GET_LRC_DATA`. Verify the existing active-tab case still loads
(now via songId parsed from the active tab URL — no content script).

### Phase C — Song sourcing from any tab + paste UI (US1, US2)
Add `popup/songSource.ts`: resolve a `SongRef` by precedence — explicit pasted link >
active Suno song tab (parse `tab.url`) > a single background Suno song tab
(`chrome.tabs.query({url})`); multiple background tabs → offer a choice. Reinstate the
**paste-a-link control** (top-bar ghost `.icon-btn` toggle + Empty-state input), supporting
paste and drag-and-drop; invalid input shows the `bad_link` message. Bootstrap no longer
hard-gates on `tab.url.includes('suno.com')` — it always renders a usable state.

### Phase D — Distinct failure messaging (US3 baseline, FR-011)
Classify failures via `shared/loadError.ts` and render distinct copy in `views/error.ts`
(invalid link / not signed in / session expired / song inaccessible / offline). Reconnect
re-runs the load. Add the new i18n keys.

### Phase E — Token freshness via live Suno tab (US3, P3)
On a `session-expired` classification, if any Suno tab is open, inject a MAIN-world
`Clerk.session.getToken()` snippet via `chrome.scripting.executeScript`, bridge the fresh
token back, and retry once. If no Suno tab exists, fall through to the reconnect message.
Gate behind the same no-new-permissions constraint.

### Phase F — Cleanup + QA
Remove the now-dead `GET_LRC_DATA` content-script handler and the retired discovery paths;
confirm no dangling imports; run typecheck/lint/tests; walk the quickstart matrix.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| On-demand MAIN-world `Clerk.session.getToken()` injection (Phase E) | Cookie-jar `__session` can be expired when no Suno tab refreshed it; minting from a live session is the only reliable fresh-token source without undocumented backend calls | Reading only the cookie jar leaves stale-token failures (US3) unsolved; calling Clerk's internal token endpoint from the background is more brittle and undocumented |
| Credentialed song-page HTML fetch + DOM-free parse (Phase A/B) | Metadata (title/artist/media URLs) was only available via live-DOM scraping in the content script; tab-independence requires obtaining it without an active page | Keeping the content-script scrape would re-introduce the active-tab dependency this feature exists to remove |

## Tracked follow-up (accessibility, per Constitution IV)
Full WCAG 2.1 AA pass — complete ARIA/semantics on the paste control and error states,
contrast audit of any new affordances, and `prefers-reduced-motion` — is deferred and must
be carried by a `/speckit-checklist` accessibility checklist before release, continuing the
follow-up opened by feature 001. AA remains the target; only timing is phased.
