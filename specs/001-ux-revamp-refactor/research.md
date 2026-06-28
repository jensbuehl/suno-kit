# Phase 0 — Research & Decisions

Feature: Popup UX Revamp & Refactor (001). This consolidates the decisions behind the
plan. Items marked **(clarified)** were resolved in the `/speckit-clarify` sessions and are
recorded in [spec.md](./spec.md) → Clarifications; the rest are technical research for the
build.

---

## D1. Design-token naming — bare names **(clarified)**

- **Decision**: One canonical token layer using **bare names** (`--accent`, `--bg-app`,
  `--bg-sunken`, …). `design/theme.css` ships `--sc-*` names; these are normalized to bare
  on import to `src/popup/theme.css`, and the legacy `popup.css` names
  (`--accent-primary`, `--bg-primary`) are migrated to the same scheme.
- **Rationale**: Constitution III mandates a single token SSOT; bare names match spec §1
  tables and the user's choice; one scheme prevents the current three-way drift.
- **Alternatives**: `--sc-*` prefix (rejected by user); keep legacy `--accent-primary`
  (rejected — partial, value-ish names).

## D2. Audio URL source — embedded JSON, not CDN pattern **(clarified)**

- **Decision**: Add `MediaUrls.audio`, extracted from the embedded Next.js JSON via the
  existing `metadata.ts` walk (the same source as cover/video and duration/model). One
  source feeds the player, Download MP3, and the ZIP audio item.
- **Rationale**: Reuses an existing authenticated data path (constitution II) and avoids a
  hard-coded CDN URL pattern Suno can change. The current code's
  `${CDN_BASE}/${songId}.mp3` is exactly that fragile pattern.
- **Alternatives**: Hard-coded CDN pattern (rejected — brittle); audio out of scope
  (rejected — player/Download MP3/ZIP all need it).
- **Risk/Note**: The embedded JSON may not always carry an audio URL. Fall back gracefully
  — when absent, disable the Audio tab and ZIP audio item (per §8), never guess.

## D3. ZIP library — fflate **(clarified)**

- **Decision**: `fflate` (~8 KB, zero-dep) for real client-side `.zip` assembly in
  `popup/zip.ts`.
- **Rationale**: A correct DEFLATE+ZIP is far more code/risk to hand-roll; fflate is
  smaller and faster than JSZip — best fit for an extension bundle (constitution I).
- **Alternatives**: JSZip (heavier); sequential downloads (rejected — not a real archive,
  worse UX); hand-rolled store-only zip (rejected — no compression, still nontrivial).

## D4. ZIP/media fetch path — background binary broker

- **Decision**: Fetch asset bytes in the **background service worker** (returns
  `ArrayBuffer`s) and assemble the zip in the popup.
- **Rationale**: Popup `fetch()` of CDN media may hit CORS; the background worker already
  brokers privileged requests (cookies). Keeps one privileged egress point (auditable).
- **Alternatives**: Direct popup `fetch` (may fail CORS); per-file
  `chrome.downloads.download` then no zip (rejected — defeats the feature).
- **Open detail for implementation**: confirm whether `host_permissions` already cover the
  CDN origin; add to `manifest.json` only if a fetch is blocked.

## D5. Audio waveform fidelity

- **Decision**: Acceptable baseline = fixed bar heights **filled by real playback
  position**; ideal = real peaks via Web Audio `decodeAudioData`. Never fake the position.
- **Rationale**: Spec §3.5a. Position correctness matters more than peak realism; decoding
  is optional and can be added later without changing the UI contract.
- **Alternatives**: Timer-driven fake progress (rejected — drifts, can be sped up by stray
  timers); mandatory peak decode (rejected — heavier, not required for v1).

## D6. Timestamps-off rendering — additive helper

- **Decision**: Add `stripTimestamps(lrc)` to `textProcessing.ts`; do **not** change
  `convertLrc`'s contract. Display/Copy apply it when `timestamps` is off; `.lrc` download
  always keeps timestamps.
- **Rationale**: Keeps the well-tested `convertLrc` intact (constitution II) and isolates
  the new behavior for unit testing.
- **Alternatives**: A flag inside `convertLrc` (rejected — widens a tested contract).

## D7. Paste-by-URL — parse then reuse `GET_LRC_DATA` **(clarified)**

- **Decision**: `songUrl.ts` parses `songId` from a pasted Suno URL; Load routes it through
  the existing `GET_LRC_DATA` path with that id. Invalid input → inline `bad_link`.
- **Rationale**: No new scraping path; reuses the entire resolve pipeline (constitution II).
- **Alternatives**: New page-context-independent fetch path (rejected — duplicate logic);
  paste UI-only/stub (rejected by clarification — dead input is bad UX).
- **Implementation note**: The content script resolves `songId` from `window.location`
  today; the pasted-id flow must pass the id explicitly into `getLrcData` rather than
  reading the URL. Verify `GET_LRC_DATA` can accept an explicit `songId` (extend the
  request if needed — see contracts/messaging.md).

## D8. Theme switching — dark only shipped **(clarified)**

- **Decision**: Ship dark only; keep the `data-sc-theme` architecture (ember/mono as
  token-proof), no user picker.
- **Rationale**: Spec §2 "no user-facing settings" + constitution I; theming stays a
  one-block override for the future.
- **Alternatives**: User theme picker (rejected — re-adds settings); `prefers-color-scheme`
  auto (rejected — needs a light theme now).

## D9. Accessibility — minimal baseline now **(clarified, deviation)**

- **Decision**: Visible focus rings + keyboard operability for primary actions this
  feature; full ARIA/`tablist`/reduced-motion/contrast audit deferred.
- **Rationale**: Scope/sequencing to ship the revamp. Recorded as a justified deviation
  from constitution IV (WCAG 2.1 AA) — not waived; tracked as a follow-up pass.
- **Alternatives**: Full AA in this feature (rejected on scope); no a11y (rejected —
  violates IV outright).

## D10. Rendering approach — vanilla DOM + state machine

- **Decision**: Keep framework-free DOM rendering; introduce an explicit state model
  (`state.ts`) and per-view render modules (`views/*`). `popup.ts` becomes bootstrap +
  router.
- **Rationale**: Constitution I (no new framework) while curing the 515-line monolith.
- **Alternatives**: Introduce a UI framework (rejected — new dependency/complexity); keep
  the monolith (rejected — the deferred refactor is in scope).

## D11. Fonts — bundle locally

- **Decision**: Bundle JetBrains Mono + Space Grotesk in the extension; no hot-linking.
- **Rationale**: Extension reliability/offline + privacy (no third-party font request).
- **Alternatives**: Google Fonts CDN (rejected — network dependency, privacy).
