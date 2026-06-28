---
description: "Task list for the Popup UX Revamp & Refactor (001)"
---

# Tasks: Popup UX Revamp & Refactor

**Input**: Design documents from `/specs/001-ux-revamp-refactor/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required)

**Tests**: Unit tests are included **only** for the new pure logic the plan calls out
(timestamps-off rendering, URL→songId parsing, ZIP manifest building). DOM/view wiring is
verified manually (QA matrix in Polish) — no full TDD.

**Organization**: Tasks are grouped by user story for independent implementation and
delivery. Stories are framed around the existing single-user popup; the new UI replaces
the current popup wholesale, so most stories extend a shared loaded-view shell.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task serves (US1–US5)
- File paths are repo-relative.

## Path Conventions

Single-project browser extension: source under `src/`, unit tests under `tests/`, bundled
to `dist/` via [build.mjs](../../build.mjs).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Assets and build wiring needed before the popup can be rebuilt.

- [ ] T001 [P] Bundle JetBrains Mono + Space Grotesk locally under `public/fonts/` and declare `@font-face` (no hot-linking) for use by `src/popup/popup.css`
- [ ] T002 [P] Update `build.mjs` to emit `src/popup/theme.css` and the fonts into `dist/` alongside the popup assets
- [ ] T003 [P] Create `src/popup/icons.ts` — inline-SVG stroke-icon helper (link, download, list, waveform, image, play, clock, check, refresh, warning, music-note) using `currentColor` (no emoji)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The token layer, English-only strings, state machine, and view shell that
**every** user story depends on. This is also the bulk of the state/view refactor.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [ ] T004 Move `specs/001-ux-revamp-refactor/design/theme.css` → `src/popup/theme.css` as the canonical token layer and normalize all `--sc-*` names to **bare names** (`--accent`, `--bg-app`, …) per spec §1
- [ ] T005 Rewrite `src/popup/popup.css` to consume bare tokens only (no literal hex/px), set the **420px** frame, radii/spacing/custom scrollbar, and migrate legacy `--accent-primary`/`--bg-primary` to bare tokens; link `theme.css` before `popup.css` in `src/popup/popup.html`
- [ ] T006 Rebuild `src/popup/popup.html` shell: top bar (wordmark + paste toggle), persistent footer status, and mount points for the four views; remove the gear button, language switcher, token `<select>`, and emoji icons
- [ ] T007 Rewrite `src/popup/i18n.ts` to a single **English-only** string map using the spec §7 keys (remove DE, the profane placeholders, and `LANGS`/`Lang`)
- [ ] T008 Remove `LANG_STORAGE_KEY` from `src/shared/config.ts` and delete all language plumbing (`translate`-by-lang, `setLanguage`, `.lang-btn` handlers) from the popup
- [ ] T009 Create `src/popup/state.ts` — UI state model (`view`, `tab`, `timestamps`, `removePunct`, `caseMode`, `pasteOpen`, `zipOpen`, `zip.*`, `advancedOpen`) per spec §7 with pure update/transition helpers
- [ ] T010 Slim `src/popup/popup.ts` to bootstrap + a view router that renders the active view from `state.ts` and wires the initial `GET_LRC_DATA` round-trip (active tab → loading → loaded/empty), reusing `sendLrcRequest`
- [ ] T011 [P] Create `src/popup/views/loading.ts` — skeleton shimmer + spinner per spec §5
- [ ] T012 [P] Create `src/popup/views/empty.ts` — no-song state per spec §4 (paste input + Load + "Open suno.com →"); Load handler stubbed until US5

**Checkpoint**: The popup opens in the new dark-themed 420px shell, routes between
loading/empty, and carries no language/token/gear chrome.

---

## Phase 3: User Story 1 — Lyrics: view, format, copy & download (Priority: P1) 🎯 MVP

**Goal**: For the detected song, render the lyrics in the new UI with the Timestamps /
Clean / case toolbar, and Copy lyrics + `.lrc` download — the core value of the tool.

**Independent Test**: Open the popup on a Suno song page → source card + Lyrics tab show;
toggling Timestamps/Clean/case re-renders correctly; Copy puts the (formatted) text on the
clipboard; `.lrc` downloads a timed file regardless of the Timestamps toggle.

- [ ] T013 [P] [US1] Add timestamps-off rendering to `src/popup/textProcessing.ts` (e.g. `stripTimestamps(lrc)`), keeping `convertLrc`'s contract and always-timed `.lrc`
- [ ] T014 [P] [US1] Unit-test timestamps-off + stacked options in `tests/textProcessing.test.ts`
- [ ] T015 [US1] Create `src/popup/views/loaded.ts` — source card (cover/title/artist/meta) + tab bar container, Lyrics active by default (spec §3.1, §3.3)
- [ ] T016 [US1] Implement the Lyrics tab in `src/popup/views/loaded.ts` — lyrics box rendering each line (timestamp span + text), custom scrollbar (spec §3.4)
- [ ] T017 [US1] Implement the lyrics toolbar in `src/popup/views/loaded.ts` — Timestamps toggle, Clean (`removePunct`), case segment (`toUpper`/`toLower`) wired to `state.ts`, re-rendering via `convertLrc`/`applyTextOptions`/`stripTimestamps`
- [ ] T018 [US1] Wire Copy lyrics (reuse clipboard, honoring toolbar state) and `.lrc` download (always timed; reuse `addVizzyWorkaround` + `cleanFilename`) in `src/popup/views/loaded.ts`
- [ ] T019 [US1] Show connected status in the footer when loaded (spec §3.6)

**Checkpoint**: User Story 1 is fully usable — lyrics MVP works end-to-end in the new UI.

---

## Phase 4: User Story 2 — Tabs & per-asset downloads incl. audio player (Priority: P2)

**Goal**: Audio / Cover / Video tabs each preview their asset and carry a download, with a
real audio preview player. Adds the `mediaUrls.audio` data path.

**Independent Test**: Switch tabs → each shows its preview; Audio tab plays/pauses and the
waveform fills to real playback position and seeks on click; Download MP3/cover/video save
the right files; unavailable assets are disabled.

- [ ] T020 [P] [US2] Extend `src/shared/types.ts` — add `audio?` to `MediaUrls` and optional `duration?`/`model?` to `SongMetadata`/`LrcDataResponse`
- [ ] T021 [US2] Extend `src/content/metadata.ts` to extract `mediaUrls.audio` (and `duration`/`model` when cheap) from the embedded Next.js JSON (Method 4), keeping image/video logic
- [ ] T022 [US2] Ensure the new fields flow through `getLrcData` in `src/content/index.ts` to the popup
- [ ] T023 [US2] Switch the MP3 download off the `${CDN_BASE}/${songId}.mp3` pattern to `mediaUrls.audio` (reuse `downloadMedia`) in the popup; wire the inline `asset_failed` error shown on **any** failed single-asset download (MP3/cover/video) per spec §8
- [ ] T024 [P] [US2] Implement the Cover tab in `src/popup/views/loaded.ts` — artwork preview + Download cover; disabled when `mediaUrls.image` absent (spec §3.5)
- [ ] T025 [P] [US2] Implement the Video tab in `src/popup/views/loaded.ts` — visualizer preview + Download video; reuse `checkVideoAvailability` to disable when unreachable (spec §3.5)
- [ ] T026 [US2] Create `src/popup/views/audioPlayer.ts` — `<audio>` fed `mediaUrls.audio`, play/pause, `current/total` readout, clickable waveform scrubber filling to real playback position (spec §3.5a)
- [ ] T027 [US2] Wire the Audio tab + Download MP3 in `src/popup/views/loaded.ts` using `audioPlayer.ts`; disable the Audio tab when no `mediaUrls.audio`

**Checkpoint**: US1 + US2 both work — full per-asset preview and download.

---

## Phase 5: User Story 3 — Download all as ZIP (Priority: P3)

**Goal**: A song-level package action that builds a real `.zip` of the selected assets.

**Independent Test**: Open the ZIP panel → toggle items → button label updates
(`Download ZIP · {n} files · ~{size}`, disabled at 0) → download yields one `.zip`
containing exactly the checked, fetchable assets; a failed asset is skipped, not fatal.

- [ ] T028 [US3] Add `fflate` to `package.json` dependencies and install
- [ ] T029 [P] [US3] Create `src/popup/zip.ts` — build the zip manifest (selected items, names via `cleanFilename`, raw timed `.lrc`) and assemble the blob with fflate; keep manifest/name logic as pure, testable helpers
- [ ] T030 [P] [US3] Unit-test the zip manifest/name building in `tests/zip.test.ts`
- [ ] T031 [US3] Add a binary-fetch broker in `src/background/index.ts` (+ message types in `src/shared/types.ts`) that fetches asset URLs as `ArrayBuffer`s (CORS-safe), per plan Phase 5
- [ ] T032 [US3] Implement the ZIP package panel UI in `src/popup/views/loaded.ts` (spec §3.2) — checklist (lyrics/audio/cover/video), live button label, disabled at 0
- [ ] T033 [US3] Wire the build: fetch selected blobs via the broker → fflate → `chrome.downloads.download` named `{title}.zip`; per-asset graceful skip + spinner (spec §8)

**Checkpoint**: US1–US3 work — single-archive download with graceful per-asset failure.

---

## Phase 6: User Story 4 — Resilient connection: token error & manual fallback (Priority: P4)

**Goal**: Token discovery is invisible on success; on failure the user gets a clear error
state with Reconnect and a progressive manual-token fallback. No dead ends.

**Independent Test**: With a failing/absent token, the popup shows the error state;
Reconnect retries; expanding "Choose token source manually" lists discovered options and
"Retry with this source" reloads via the chosen path.

- [ ] T034 [P] [US4] Create `src/popup/views/error.ts` — token error state with Reconnect (spec §6)
- [ ] T035 [US4] Route `lrcContent == null` (with options present) to the error view and wire Reconnect to re-issue `GET_LRC_DATA` (`auto`) → loading, in `src/popup/popup.ts`
- [ ] T036 [US4] Implement the manual fallback (`advancedOpen`) in `src/popup/views/error.ts` — `<select>` from `tokenOptions` + "Retry with this source" → `GET_LRC_DATA` with `tokenOptionId`
- [ ] T037 [US4] Footer shows not-connected on error (spec §3.6); confirm the token `<select>` never renders in the loaded UI

**Checkpoint**: US1–US4 work — graceful recovery from token failures.

---

## Phase 7: User Story 5 — Load any song by pasted link (Priority: P5)

**Goal**: Resolve a song from a pasted Suno URL instead of only the active tab.

**Independent Test**: Paste a valid Suno song URL + Load → that song loads; paste garbage →
inline `bad_link` error, no crash. Works from both the top-bar paste row and the empty state.

- [ ] T038 [P] [US5] Create `src/popup/songUrl.ts` — pure parser extracting `songId` from a pasted Suno URL
- [ ] T039 [P] [US5] Unit-test URL→songId parsing in `tests/songUrl.test.ts`
- [ ] T040 [US5] Implement the top-bar paste row toggle (`pasteOpen`) + input/Load in the shell (spec §2)
- [ ] T041 [US5] Wire Load (top bar + empty state) to parse `songId` → `GET_LRC_DATA` for that id → loading→loaded; inline `bad_link` on parse failure

**Checkpoint**: All five stories work independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility baseline, transitions, and final verification across stories.

- [ ] T042 [P] Accessibility minimal baseline (spec §9) — token-driven visible focus rings + keyboard operability for primary actions (tabs, Copy, `.lrc`, all downloads, ZIP, Load, Reconnect), Esc/tab order, across all views
- [ ] T043 [P] Empty→loaded transitions and final visual polish (dot separators, ellipsis on long title/artist)
- [ ] T044 Run `npm run check` (typecheck + lint + test) and resolve all issues
- [ ] T045 Execute the QA matrix in [quickstart.md](./quickstart.md) — signed-in/out; song vs. non-song tab; missing cover/video; no `mediaUrls.audio`; very long title/artist; each ZIP subset incl. none; ZIP with one asset failing; audio play/pause/seek + end-of-track reset

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**.
- **User Stories (Phase 3–7)**: all depend on Foundational. US1 is the MVP. US2–US5 build
  on the loaded-view shell created in US1 (`src/popup/views/loaded.ts`), so they integrate
  with US1 rather than being fully file-isolated.
- **Polish (Phase 8)**: depends on the desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: after Foundational. Creates `loaded.ts` (the shared loaded shell).
- **US2 (P2)**: after US1 (extends `loaded.ts`; adds the `mediaUrls.audio` data path).
- **US3 (P3)**: after US2 (ZIP audio item needs `mediaUrls.audio`; extends `loaded.ts`).
- **US4 (P4)**: after Foundational; independent of US1–US3 (own `error.ts`).
- **US5 (P5)**: after Foundational; independent of US1–US3 (reuses `GET_LRC_DATA`).

### Within Each Story

- Pure-logic unit tests ([P]) can be written alongside their helper.
- Data/types before the views that consume them (e.g. T020/T021 before T026/T027).
- Tasks touching the same file (notably `src/popup/views/loaded.ts`) are **not** [P] with
  each other and run in listed order.

### Parallel Opportunities

- All Setup tasks (T001–T003) are [P].
- Foundational T011/T012 are [P] (distinct view files).
- Within US2, T024/T025 are [P]; T020 is [P] (types) ahead of T021.
- US3 T029/T030 are [P]. US5 T038/T039 are [P].
- US4 and US5 can be developed in parallel with each other (disjoint files).
- Polish T042/T043 are [P].

---

## Parallel Example: User Story 2

```bash
# After T020 (types) lands, the two asset tabs are independent files-of-edit
# (both in loaded.ts → run sequentially), but data + player can progress together:
Task: "T021 Extend metadata.ts to extract mediaUrls.audio"
Task: "T026 Create src/popup/views/audioPlayer.ts (<audio> + waveform)"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational (the refactor + token/i18n SSOT).
2. Phase 3 US1 (lyrics).
3. **STOP & VALIDATE**: the new popup reaches feature parity for the core lyrics flow.
4. Ship/demo.

### Incremental Delivery

US1 (lyrics) → US2 (asset tabs + player) → US3 (ZIP) → US4 (token resilience) →
US5 (paste-by-URL). Each adds value without breaking the prior increment. Run `npm run
check` after each story.

### Notes

- [P] = different files, no incomplete-task dependency.
- Reuse first (constitution II): `getLrcData`/`GET_LRC_DATA`, `tokenDiscovery`,
  `convertLrc`/`applyTextOptions`, `cleanFilename`, `checkVideoAvailability`,
  `downloadMedia` are extended, not rebuilt.
- Tokens only (constitution III): no literal hex/px in components; strings via `i18n.ts`.
- Accessibility is the one scoped deviation (minimal baseline now; full WCAG AA pass is a
  tracked follow-up — see plan Constitution check).
- Commit after each task or logical group.
