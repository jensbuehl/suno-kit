---

description: "Task list for Tab-Independent Song Loading & Paste-a-Link"
---

# Tasks: Tab-Independent Song Loading & Paste-a-Link

**Input**: Design documents from `specs/002-token-paste-link/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/messages.md](./contracts/messages.md), [quickstart.md](./quickstart.md)

**Tests**: The spec did not request full TDD. Per plan, the three **pure helpers**
(`parseSongId`, `parseSongMetadata`, `classifyLoadError`) get unit tests; everything else is
verified via the [quickstart.md](./quickstart.md) manual matrix. Existing tests under
`tests/` for moved modules must keep passing.

**Organization**: Tasks are grouped by user story. MVP = User Story 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 — setup, foundational, and polish tasks carry no story label

## Path Conventions

Single project, Chrome MV3 extension. Source under `src/` (`src/shared`, `src/popup`,
`src/background`, `src/content`), tests under `tests/`, manifest at repo root. Build via
`build.mjs` (esbuild) → `dist/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Strings and types shared across the stories.

- [ ] T001 [P] Add new i18n keys to `src/popup/i18n.ts`: paste control label/placeholder and the distinct error messages `err_bad_link`, `err_not_signed_in`, `err_session_expired`, `err_song_inaccessible`, `err_offline`, `err_unknown` (English-only map; SSOT — no inline strings).
- [ ] T002 [P] Add shared types to `src/shared/types.ts`: `SongRef` (`songId`, `source: 'paste'|'active-tab'|'background-tab'`, `sourceUrl?`), the `LoadError` discriminated union, and optional `songId` on `GetLrcDataRequest` (per [data-model.md](./data-model.md)).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the cross-context core into `src/shared/` and stand up the
popup-orchestrated load so retrieval no longer depends on the active-tab content script.

**⚠️ CRITICAL**: No user story can be implemented until this phase is complete. At the
checkpoint, the **existing active-tab flow must still load a song** — now via the new path.

- [ ] T003 Move `src/content/tokenDiscovery.ts` → `src/shared/tokenDiscovery.ts`; delete the `document.cookie` (Weg 2) and `localStorage` (Weg 3) discovery, keeping only the `chrome.cookies` path (Weg 1) and the option/`indexById` builder.
- [ ] T004 Update `tests/tokenDiscovery.test.ts` import to `src/shared/tokenDiscovery` and trim/adjust cases for the removed Weg 2/3 paths so the suite passes.
- [ ] T005 Move `src/content/sunoApi.ts` → `src/shared/sunoApi.ts`; surface the HTTP status to the caller (e.g. return `{ words, status }` or throw a typed error) so error classification can tell 401 from 404; add `fetchSongPageHtml(songId)` — credentialed GET of `https://suno.com/song/{id}` returning HTML text (per [contracts/messages.md](./contracts/messages.md) §6).
- [ ] T006 [P] Move `src/content/lrc.ts` → `src/shared/lrc.ts` and update the import in `tests/lrc.test.ts`.
- [ ] T007 [P] Create `src/shared/songUrl.ts` — `parseSongId(input)` accepting `https://suno.com/song/<id>` (with/without `www`/query/hash/trailing slash, http/https) and a bare unambiguous id; returns `null` for profile/playlist/home/non-Suno; never throws.
- [ ] T008 [P] Create `src/shared/songMetadata.ts` — `parseSongMetadata(html, songId)` extracted from `src/content/metadata.ts` Method 4 (the `self.__next_f.push` regex), plus `og:title`/`og:image`/`og:video`/description parsing and the existing CDN-pattern fallback; pure and DOM-free.
- [ ] T009 [P] Create `src/shared/loadError.ts` — `classifyLoadError(ctx)` → `LoadError` per the mapping in [data-model.md](./data-model.md) / [contracts/messages.md](./contracts/messages.md) §4.
- [ ] T010 Create `src/popup/loadSong.ts` — orchestrate a load for a `SongRef`+`tokenOptionId`: read cookies via the existing `FC_GET_SUNO_COOKIES` broker, build candidates (T003), try `aligned_lyrics` (T005), on success `fetchSongPageHtml` + `parseSongMetadata` (T005/T008), assemble a `SongResult`; return `{ok:true,result}` or `{ok:false,error}` via `classifyLoadError` (T009).
- [ ] T011 Rewire `src/popup/popup.ts` to resolve the active tab's `songId` from `tab.url` and call `loadSong()` instead of `sendLrcRequest`/`GET_LRC_DATA`; remove the content-script messaging from the load path while keeping the active-Suno-tab auto-load behavior intact (no regression).
- [ ] T012 [P] Add unit tests `tests/songUrl.test.ts`, `tests/songMetadata.test.ts`, `tests/loadError.test.ts` covering valid/invalid/bare-id links, sample server HTML → all media fields + CDN fallback, and every `LoadError` kind.
- [ ] T013 Validate `parseSongMetadata` against a real signed-in song page's fetched HTML (research R2); confirm `audio_url`/cover/video/title/artist resolve, and adjust the regex or lean on the CDN fallback for any field absent server-side.

**Checkpoint**: Active-tab song load works end-to-end through the popup-orchestrated path; shared core + tests green.

---

## Phase 3: User Story 1 - Load a song by pasting its link, from any tab (Priority: P1) 🎯 MVP

**Goal**: From any active tab, paste or drop a Suno song link and load that song.

**Independent Test**: With a non-Suno tab active and signed in to Suno, paste a valid song link into the popup → the correct song loads; an invalid link shows a clear message.

### Implementation for User Story 1

- [ ] T014 [US1] Remove the active-tab hard gate in `src/popup/popup.ts` bootstrap (`tab.url.includes('suno.com')`) so a non-Suno active tab renders a usable Empty state instead of dead-ending (FR-001).
- [ ] T015 [US1] Reinstate the paste UI in `src/popup/views/empty.ts`: a link `.text-input` + Load `.btn` plus drag-and-drop handlers (reuse existing tokens; no new design tokens).
- [ ] T016 [US1] Add the top-bar paste toggle in `src/popup/popup.ts` `topbarHtml()` using the existing `.icon-btn`/`.topbar-actions` (link-chain icon, `aria-pressed`) to reveal the link input.
- [ ] T017 [US1] Create `src/popup/songSource.ts` with the paste branch: `resolveFromInput(input)` → `SongRef{source:'paste'}` via `parseSongId`, or `null`.
- [ ] T018 [US1] Wire the paste/drop Load handler in `src/popup/popup.ts`: `parseSongId` → `loading` → `loadSong(ref)` → `loaded`|`error`; on `null`/`bad-link` show inline `err_bad_link` (reuse `.inline-error`), staying on the current view.
- [ ] T019 [US1] Enforce pasted-link precedence over the active tab at the load entry point (FR-008).

**Checkpoint**: Paste/drop a valid link from a non-Suno tab → song loads (SC-001/003); invalid link → `err_bad_link`. MVP complete.

---

## Phase 4: User Story 2 - Use a Suno song already open in another tab (Priority: P2)

**Goal**: Pick up a song from a non-active / background Suno tab without pasting.

**Independent Test**: Open a Suno song in a background tab, switch to a non-Suno tab, open the popup → the song is surfaced/loaded without switching tabs.

### Implementation for User Story 2

- [ ] T020 [US2] Extend `src/popup/songSource.ts` to resolve a `SongRef` from the active tab URL and from background tabs via `chrome.tabs.query({ url: '*://suno.com/song/*' })`, applying precedence paste > active-tab > background-tab.
- [ ] T021 [US2] Add multi-tab disambiguation: when >1 background song tab and no pasted link, render a chooser list in the Empty state rather than guessing (FR-008); selecting one loads it.
- [ ] T022 [US2] Update `src/popup/popup.ts` bootstrap to use `songSource` for zero-input resolution (auto-load the active or the single background song tab; chooser otherwise), preserving the existing active-tab auto-load (SC-006).

**Checkpoint**: Background Suno song tab loads from a non-Suno active tab; active-tab auto-load unregressed.

---

## Phase 5: User Story 3 - Recover gracefully when the session is stale (Priority: P3)

**Goal**: Distinct, recoverable feedback when credentials are stale; mint fresh credentials from a live Suno tab when one exists.

**Independent Test**: Force a stale-credential condition; with a Suno tab open the load self-heals; with none open, a clear "session expired / reconnect" path appears (no silent hang).

### Implementation for User Story 3

- [ ] T023 [US3] Refine `src/popup/views/error.ts` to render distinct copy per `LoadError.kind` (`not-signed-in`, `session-expired`, `song-inaccessible`, `offline`, `unknown`) using the T001 keys; Reconnect re-runs the load.
- [ ] T024 [US3] Add MAIN-world token minting (helper in `src/popup/loadSong.ts` or new `src/popup/tokenRefresh.ts`): `chrome.scripting.executeScript({ world:'MAIN' })` into an open Suno tab calling `window.Clerk.session.getToken()`, bridged back; returns a fresh JWT or null (contracts §7).
- [ ] T025 [US3] In `loadSong`, on a `session-expired` classification with a Suno tab open, mint a fresh token (T024) and retry once; if no Suno tab exists, return `session-expired` (canRefresh:false) → reconnect message. No undocumented backend refresh.
- [ ] T026 [US3] Map network/fetch throw → `offline` and song 404/403 → `song-inaccessible` in `loadSong` via the `classifyLoadError` ctx (FR-011).

**Checkpoint**: Stale session self-heals when a Suno tab is alive; otherwise distinct, actionable errors (SC-004/005). All stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Retire the content-script load path: remove the `GET_LRC_DATA` handler in `src/content/index.ts` (delete the file if empty), drop the `content_scripts` entry in `manifest.json`, delete `src/content/metadata.ts`/`src/content/sunoApi.ts`/etc. once fully superseded, and fix any dangling imports.
- [ ] T028 [P] Accessibility baseline: keyboard operability + visible focus for the paste toggle/input, Load, the tab chooser, and Reconnect (global focus ring is token-driven); record remaining WCAG AA items as the tracked follow-up.
- [ ] T029 [P] Verify no token/JWT is logged or written to downloads/ZIP manifests (FR-012/SC-007); audit `logger` calls in the touched modules.
- [ ] T030 Run `npm run check` (typecheck + lint + test) and fix; then walk the [quickstart.md](./quickstart.md) QA matrix (rows 1–18).
- [ ] T031 [P] Update `README.md` to describe the paste-a-link / any-tab usage flow if changed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**. T003→T004; T005 before T010; T007/T008/T009 before T010; T010 before T011; T012 after the helpers exist.
- **User Stories (Phase 3–5)**: all depend on Foundational. Then independently testable; recommended in priority order P1 → P2 → P3.
- **Polish (Phase 6)**: after the desired stories are complete (T027 specifically after T011/T022 prove the content script is unused).

### User Story Dependencies

- **US1 (P1)**: needs Foundational only. MVP.
- **US2 (P2)**: needs Foundational; extends the same `songSource.ts` US1 introduces (sequence T017 → T020 to avoid a same-file clash).
- **US3 (P3)**: needs Foundational; refines `loadSong`/`error.ts` — independent of US1/US2 UI.

### Parallel Opportunities

- Setup: T001 ∥ T002.
- Foundational: after the moves (T003/T005), T006 ∥ T007 ∥ T008 ∥ T009 (different new files); T012 ∥ once helpers exist.
- Polish: T027 ∥ T028 ∥ T029 ∥ T031.
- Cross-story: with multiple devs, US1/US2/US3 can proceed in parallel after Phase 2 — except US2's T020 touches `songSource.ts` created in US1's T017.

---

## Parallel Example: Foundational helpers

```bash
# After T003 (tokenDiscovery moved) and T005 (sunoApi moved), launch the new pure modules together:
Task: "Create src/shared/songUrl.ts (parseSongId)"          # T007
Task: "Create src/shared/songMetadata.ts (parseSongMetadata)" # T008
Task: "Create src/shared/loadError.ts (classifyLoadError)"   # T009
Task: "Move src/content/lrc.ts → src/shared/lrc.ts + test"   # T006
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational (**critical** — proves the architecture; active-tab load still works) → 3. Phase 3 US1.
4. **STOP and VALIDATE**: paste a link from a non-Suno tab; invalid link messaging. Demo.

### Incremental Delivery

Foundational → US1 (MVP: paste-from-anywhere) → US2 (background-tab pickup) → US3 (freshness + distinct errors). Each increment is independently testable and adds value without breaking the previous one.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- Moving `tokenDiscovery`/`lrc`/`sunoApi` into `shared/` is a relocation (Reuse, not rewrite); update the few importers (`content/index.ts` transitionally, then removed; `tests/*`).
- The one net-new complexity (MAIN-world mint, T024/T025) is scoped to US3 and tracked in the plan's Complexity Tracking.
- No new permissions (FR-014): `host_permissions`, `cookies`, `scripting`, `tabs`-by-host are already granted.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
