# Implementation Plan — Popup Overhaul

Phased build against the existing repo (`jensbuehl/suno-copilot`, MV3, vanilla TS +
esbuild). The popup stays framework-free: `popup.ts` renders/updates the DOM as it
does now. Read `spec.md` for exact values; this file is the order of operations and
the new logic required.

## Guiding principles
- **No framework, no rewrite of the pipeline.** The content script, token discovery,
  and `aligned_lyrics` fetch stay as-is. This is a popup-layer (DOM + CSS + state)
  overhaul plus one new feature (ZIP).
- Ship in vertical slices that each leave the extension working.

---

## Phase 0 — Prep
- Reduce popup to **420 px** (`popup.css` `html/body/.container` width 650 → 420).
- Reconcile the palette: update `:root` tokens in `popup.css` to the SPEC §1 values
  by adopting **`design/theme.css`** (this bundle) as the single source of truth — move
  it into `src/popup/theme.css` and fold it into `popup.css`'s `:root`. **Token naming
  (clarified): bare names are canonical** (`--accent`, `--bg-app`, `--bg-sunken`, …);
  `design/theme.css` currently ships `--sc-*` names, so normalize `--sc-*` → bare names
  on import and migrate the legacy `popup.css` names (`--accent-primary`, `--bg-primary`)
  too — exactly one naming scheme. Every rule references the bare `var(--…)`; no raw
  hex/px in components. Keep the `data-sc-theme` architecture (ember/mono exist as
  token-proof), but **ship dark only** — no user-facing theme picker (clarified). For
  themeable SVG icons use `currentColor` + a `color` token (var() is invalid inside
  SVG presentation attributes).
- Add fonts: JetBrains Mono (already used for the textarea) + Space Grotesk (wordmark,
  optional). Bundle locally or via `web_accessible_resources` — do not hot-link if
  offline support matters.
- Replace emoji icons with inline SVGs (see reference markup).

## Phase 1 — Shell: top bar + view state machine
- Introduce a `view` state (`loaded|empty|loading|error`) in `popup.ts` and render
  the matching section. Today the popup assumes a song is present; add the branches.
- Build the **top bar** (wordmark, paste-link toggle). **English-only** — no DE/EN
  toggle; drop the `translate()`/`LANG_STORAGE_KEY` language plumbing. Remove the
  gear button.
- Build **Empty** and **Loading** states (SPEC §4, §5). Loading shows while the
  `GET_LRC_DATA` round-trip is in flight; Empty when not on a `/song/` page.
- **Paste-by-URL is in scope and functional (clarified).** The top-bar paste row and
  the Empty-state input share one Load handler: parse `songId` from the pasted Suno URL
  (new pure helper `songUrl.ts`) and route it through the existing `GET_LRC_DATA` path
  with that id instead of the active tab's. Unparseable input shows the inline `bad_link`
  error. No new scraping path is added.

## Phase 2 — Source card + Tabs
- **Source card** (SPEC §3.1) from `title`/`artist`/`mediaUrls.image`. Duration/model
  optional — extract from the embedded Next.js JSON if cheap, else omit (don't block).
- **Data-layer prerequisite:** `MediaUrls` today is only `{ image, video }`. Add an
  optional `audio` field (and optional `duration`/`model`) to `shared/types.ts`, and
  extend `content/metadata.ts` (Method 4, the embedded-JSON walk) to populate
  `mediaUrls.audio` from that JSON. This single source feeds the player, Download MP3,
  and the ZIP audio item (clarified — not a hard-coded CDN pattern).
- **Tab bar** + tab switching (`tab` state). Move existing download actions into the
  per-tab panels:
  - Cover/Video panels (SPEC §3.5). Wire the existing cover/video download logic to
    each tab's button. Buttons enable once `mediaUrls` resolve.
  - **Audio panel = a preview player** (SPEC §3.5a): an `<audio>` element fed
    `mediaUrls.audio`, a play/pause transport, a `current / total` time readout, and a **clickable
    waveform that doubles as the scrubber** (bars fill to the playback position;
    click a bar to seek). The reference simulates this with a timer; in production
    drive `currentTime`/`duration` from the `<audio>` element. For a *real* waveform,
    decode the buffer via Web Audio (`decodeAudioData`) and bucket peak amplitudes;
    if that's too heavy, keep the static bar heights but still fill them from real
    playback position (truthful about where you are). Then the **Download MP3** button.

## Phase 3 — Lyrics tab + Timestamps toggle
- Render `lrcContent` as lines in the lyrics box (SPEC §3.4), styling timestamp vs.
  text spans.
- Toolbar: **Clean** → `removePunct`; **case segment** → `toUpper`/`toLower`
  (reuse `applyTextOptions`/`convertLrc`).
- **New — Timestamps toggle:** when off, strip the leading `[mm:ss.xx]` for the
  on-screen render and for **Copy lyrics**. The **`.lrc`** download always keeps
  timestamps (it's a timed-lyrics file). Add a small helper alongside `convertLrc`,
  e.g. `stripTimestamps(lrc): string`, rather than changing `convertLrc`'s contract.
- Actions: **Copy lyrics** (primary) + **`.lrc`** (secondary). Re-use existing copy
  and download handlers.

## Phase 4 — Silent token + error fallback
- **Remove** the token `<select>` + debug string from the normal/loaded UI.
- Keep `getBearerTokenFromBrowser()` + the auto-try loop untouched.
- On a failed resolve (`lrcContent == null`), render the **Token error** state
  (SPEC §6). Reconnect = re-issue `GET_LRC_DATA` (tokenOptionId `auto`) + show
  Loading. "Choose token source manually" expands a `<select>` populated from
  `tokenOptions`; selecting + "Retry with this source" re-issues `GET_LRC_DATA`
  with that `tokenOptionId` (already plumbed end-to-end).
- Footer status reflects connected/not-connected.

## Phase 5 — Download all as ZIP (new feature)
The only piece needing new infrastructure.
- **Zip lib (clarified):** add **`fflate`** (~8 KB, zero-dep; bundle via esbuild). A real
  single `.zip`, not sequential downloads. No new permission needed beyond the existing
  `downloads`. Put zip assembly in a new pure-ish `popup/zip.ts`.
- **Assets to fetch** for a given `songId`:
  - LRC — already in memory (`lrcContent`); ship the **raw timed `.lrc`** in the zip for
    portability (decided — see resolved decisions).
  - Audio — `mediaUrls.audio` (the extracted URL from Phase 2; not a CDN-pattern guess).
  - Cover — `mediaUrls.image`.
  - Video — `mediaUrls.video`.
- **Fetch path / CORS:** media fetches must use the same authenticated context the
  per-tab downloads already rely on. If `fetch()` from the popup/content context is
  blocked by CORS, route the binary fetch through the **background service worker**
  (it already brokers privileged requests) and transfer blobs back, or trigger
  individual `chrome.downloads.download()` calls and zip is skipped. **Preferred:**
  background fetches each selected URL → returns `ArrayBuffer`s → popup builds the zip
  with fflate → one `chrome.downloads.download()` of the blob named `${cleanFilename(title)}.zip`.
- **Naming:** inside the zip use `Title.lrc`, `Title.mp3`, `cover.jpg`,
  `visualizer.mp4` (run `cleanFilename()` from `textProcessing.ts` on `title`).
- **UI:** Source-card ZIP button → package panel (SPEC §3.2). Checklist toggles
  `zip.*`; button label updates `Download ZIP · {n} files · ~{size}`. Disable at
  `n == 0`. Sizes: read `Content-Length` (HEAD) for a real estimate, or compute from
  fetched buffers before the final download.
- **Progress/errors (clarified — per-asset graceful degradation, SPEC §8):** show per-file
  progress or at least a spinner on the button; if an asset 404s/fails, **skip it** and
  still deliver the rest (never abort the whole archive). Single-download buttons surface
  an inline error (`asset_failed`); assets known-unavailable from metadata are disabled.
  Only if *every* selected asset fails, surface one inline error and produce no download.

## Phase 6 — Polish
- Empty→loaded transitions.
- **Accessibility — minimal baseline (clarified, SPEC §9):** visible focus rings
  (token-driven) on every control + keyboard operability for the primary actions (tabs,
  Copy lyrics, `.lrc`, all Download buttons, ZIP Download, paste Load, Reconnect), plus
  Esc/tab order. Full ARIA labels, `tablist` semantics, and `prefers-reduced-motion` are
  **deferred** to a later a11y pass (see Constitution note below).
- Rewrite `i18n.ts` to a single **English-only** map using the SPEC §7 string keys
  (remove DE + the profane placeholders + `LANG_STORAGE_KEY`).
- QA matrix: signed-in/out; song vs. non-song tab; missing cover/video; very long
  title/artist (ellipsis); each ZIP subset incl. none; audio play/pause/seek + end-of-track reset.

---

## Resolved decisions (clarified 2026-06-28)
These were the open questions; all are now decided (see `spec.md` Clarifications).
1. **Paste-a-link — IN SCOPE & functional.** Parse `songId` from the pasted URL
   (`songUrl.ts`) → route through the existing `GET_LRC_DATA` path → inline `bad_link`
   on bad input. No new page-context-independent scraping path. (Phase 1.)
2. **Audio URL — extracted from embedded Next.js JSON into `mediaUrls.audio`**, not a
   hard-coded CDN pattern. One source feeds player + Download MP3 + ZIP. (Phase 2.)
3. **ZIP lyrics variant — raw timed `.lrc`** for portability. (Phase 5.)
4. **Duration / model — optional.** Extract from embedded JSON if cheap; otherwise omit.
   Never block on them. (Phase 2.)
5. **Theme — dark only shipped**, no user picker; ember/mono remain token-proof. (Phase 0.)
6. **Accessibility — minimal baseline this feature**, full pass deferred. (Phase 6.)

## Constitution check (v1.0.0)
- **I. Simplicity / II. Reuse** — PASS. Reuses the content/token/lyrics pipeline; the
  state machine reduces the current 515-line `popup.ts` tangle. One new dependency
  (`fflate`) is justified: a correct ZIP is far more code/risk to hand-roll, and
  sequential downloads were rejected by clarification.
- **III. Token & string SSOT** — PASS (with the Phase 0 migration to one bare-name token
  layer and the Phase 6 single EN i18n map).
- **IV. Accessible UX** — **PARTIAL / justified deviation.** The constitution mandates
  WCAG 2.1 AA; this feature ships the *minimal* baseline (visible focus + keyboard for
  primary actions) and defers full ARIA/`tablist`/reduced-motion/contrast audit to a
  dedicated follow-up a11y pass (recommend a `/speckit-checklist` accessibility checklist
  before release). Not waived — sequenced.
