# Quickstart — Manual QA Matrix

Build and load the unpacked extension from `dist/` (`npm run build`), sign in to Suno in
the same browser, then walk this matrix. Each row maps to a spec scenario / success criterion.

## Build & load
```bash
npm run build           # outputs to dist/
# chrome://extensions → Developer mode → Load unpacked → select dist/
```

## Core flows

| # | Setup | Action | Expected | Spec |
|---|-------|--------|----------|------|
| 1 | Active tab = non-Suno page; signed in | Open popup → paste a valid song URL → Load | Correct song loads (lyrics + assets) | US1 / SC-001 |
| 2 | Active tab = non-Suno | Drag-and-drop a song link onto the paste control | Same as paste | US1 |
| 3 | Active tab = non-Suno | Paste a profile/playlist/home URL | `err_bad_link`; no broken state | US1 / FR-003 |
| 4 | Active tab = non-Suno | Paste random text / empty clipboard | Gentle hint, no error state | Edge |
| 5 | A Suno song open in a **background** tab; non-Suno active | Open popup (no paste) | Background song surfaced/loadable without switching tabs | US2 / SC-003 |
| 6 | Active tab **is** a Suno song page | Open popup | Auto-loads with zero input (no regression) | US2 / SC-006 |
| 7 | Two+ Suno song tabs open; non-Suno active | Open popup (no paste) | Deterministic resolution or a chooser; never wrong/silent | US2 / FR-008 |
| 8 | Pasted link **and** active Suno tab differ | Paste the link → Load | Pasted link wins | Edge / FR-008 |

## Auth & freshness

| # | Setup | Action | Expected | Spec |
|---|-------|--------|----------|------|
| 9 | Never signed in to Suno | Try to load any song | `err_not_signed_in` with sign-in guidance | US3 / FR-011 |
| 10 | Signed in; a Suno tab is open; force stale cookie token | Load a song | Fresh token minted from the live tab; load succeeds, no error shown | US3 / FR-009 |
| 11 | Signed in; **no** Suno tab open; token expired | Load a song | `err_session_expired` + actionable Reconnect; no silent hang | US3 / SC-004 |
| 12 | After #11, open/refresh Suno, return | Retry | Load succeeds | US3 |
| 13 | Valid song link, but the account can't access that song | Load | `err_song_inaccessible` (distinct from auth error) | FR-011 / SC-005 |
| 14 | Disconnect network | Load | `err_offline` (distinct message) | FR-011 / SC-005 |

## Non-regression & hygiene

| # | Check | Expected |
|---|-------|----------|
| 15 | Existing loaded-song views (tabs, copy lyrics, .lrc, downloads, ZIP) | Work unchanged once a song loads | 
| 16 | Keyboard-only: focus + operate the paste control, Load, Reconnect | All reachable with visible focus | FR-013 |
| 17 | Inspect any downloaded file / ZIP manifest / logs | No token/JWT present | FR-012 / SC-007 |
| 18 | `npm run check` (typecheck + lint + tests) | Passes; new pure helpers covered by unit tests |

## Unit-test focus (vitest)
- `parseSongId`: valid/invalid/bare-id/query/hash/non-song variants.
- `parseSongMetadata`: sample server HTML → title/artist/audio/cover/video/duration/model; empty-field CDN fallback.
- `classifyLoadError`: each `LoadError` kind from representative contexts.
