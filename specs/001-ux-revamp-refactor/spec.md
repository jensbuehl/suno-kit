# SUNO Copilot — Popup Overhaul · Design Spec

Authoritative spec for the redesigned popup. Pair with `design/SUNO-Copilot-reference.html`
(interactive) and `design/screens/`. All hex/px values are final (hi-fi).

---

## Clarifications

### Session 2026-06-28

- Q: Canonical design-token naming scheme? → A: Bare names (`--accent`, `--bg-app`, `--bg-sunken`, …) are canonical; the `--sc-` prefix is dropped everywhere and legacy `popup.css` names (`--accent-primary`, `--bg-primary`) are migrated to the bare scheme.
- Q: Scope of "refactoring" in this feature? → A: UX revamp **plus** the deferred popup state/view refactor (explicit `view`/`tab` state machine + per-view modules). Content/messaging/build cleanup is out of scope.
- Q: How is the MP3 obtained for the player, Download MP3, and ZIP audio? → A: Extract the real audio URL from the embedded Next.js JSON, reusing the existing `metadata.ts` walk path — not a hard-coded CDN URL pattern.
- Q: How is the "Download ZIP" package built? → A: Fetch the selected asset blobs in the popup and zip them client-side with **fflate** (small, ~8 KB, zero-dep), bundled into the popup. A real single `.zip`, not sequential downloads.
- Q: Behavior when an individual asset fetch fails? → A: Per-asset graceful degradation — a failed asset is skipped in the ZIP (the rest still download), single-download buttons surface an inline error, and assets known to be unavailable are disabled. Never abort the whole archive.
- Q: Is "paste a song link" functional in this feature? → A: Yes — functional. Parse `songId` from the pasted Suno URL and route it through the existing `getLrcData()` path (same flow as the active tab). Invalid/unparseable URLs show an inline error.
- Q: Does the shipped popup expose theme switching to users? → A: No. Dark theme only for users (no picker). Ember/mono (and a future light theme) remain token-layer proof of the theming architecture, not a user-facing setting.
- Q: Accessibility baseline for this feature? → A: Minimal. Visible focus states on all controls and keyboard operability for primary actions (tabs, Copy, downloads, Load, Reconnect). Full ARIA labeling, tablist semantics, and reduced-motion handling are deferred to a later pass.

---

## 1. Frame & global

- **Popup size:** target width **420 px** (current build is 650 px — reduce to a
  real extension popup width). Height is content-driven; ~560–760 px depending on
  state. Vertical scroll only if content exceeds the browser's popup max-height.
> **All design values are centralized as CSS custom properties in `design/theme.css`
> (this bundle).** Components reference the bare tokens (`var(--accent)`,
> `var(--bg-app)`, …) only — never a raw hex/px literal, and never a `--sc-`
> prefixed name. Re-theming = override one token block; component code is untouched.
> Switch themes at runtime with `data-sc-theme="ember|mono"` on a root element
> (default, no attribute = dark). `design/theme.css` ships three worked themes (dark /
> ember / mono) as proof; add a light theme the same way. The reference HTML and
> its screenshots (`design/screens/08-ember-theme.png`) demonstrate the live switch.
>
> **Shipped scope:** the popup ships **dark only** to end users — there is no
> theme picker (consistent with "no user-facing settings", §2). Ember/mono and a
> future light theme exist solely as proof of the token architecture for later use.
>
> ⚠️ CSS variables work in CSS/`style` but **not** inside SVG presentation
> attributes (`fill="…"`, `stroke="…"`). For themeable icons, use
> `currentColor` and set `color` from a token on a parent.

- **Surfaces (dark theme — the canonical token names live in `design/theme.css`):**

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#1a1a1d` | popup background |
| `--bg-sunken` | `#161618` | lyrics box, panels, footer, inputs |
| `--bg-raised` | `#242426` | controls, chips, ghost buttons |
| `--border` | `#2a2a2e` | section dividers |
| `--border-control` | `#38383c` | control outlines |
| `--border-strong` | `#45454a` | hover/active outlines, scrollbar |
| `--accent` | `#E03C31` | primary actions, active states, timestamps |
| `--accent-weak-bg` | `rgba(224,60,49,.16)` | active pill fill |
| `--accent-weak-text` | `#ff6a5f` | active pill text |
| `--text` | `#fafafa` | primary text |
| `--text-2` | `#e6e6ea` | lyric body, list labels |
| `--text-3` | `#b5b5b5` | secondary text |
| `--text-mut` | `#6e6e72` | meta, mono captions, footer |
| `--ok` | `#3fbf6b` | connected indicator |

> The existing `popup.css` already defines `--accent-primary:#E03C31`,
> `--bg-primary:#1E1E1E`, etc. Reuse those names; the values above are the
> intended *final* palette (slightly deeper bg than current). Adjust the existing
> tokens rather than introducing a parallel set.

- **Type:**
  - UI: system stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
  - Wordmark: **Space Grotesk** 700 (optional; system 700 is an acceptable fallback).
  - Mono (lyrics, timestamps, file names/sizes): **JetBrains Mono**, fallback `Consolas, monospace`.
- **Radii:** controls/chips `8px`; cards/panels/inputs `9–12px`; popup outer `16px`.
- **Spacing:** card padding `14px 16px`; section gutters `16px`; control gap `6–8px`.
- **Icons:** inline SVG, 1.5–2.2 stroke, `currentColor`. No emoji (current popup
  uses 📋💾🎵🖼️🎬 — replace with the stroke icons in the reference).

---

## 2. Top bar (persistent, all states)

Row, `14px 16px`, bottom border `--border`.

- **Left — wordmark:** 22×22 rounded-6 red→maroon gradient tile (`#E03C31`→`#7d1812`)
  with a white music-note glyph, then "SUNO" (`#fafafa`) + "Copilot" (`#E03C31`),
  Space Grotesk 700, 15px.
- **Right — controls (gap 8px):**
  - **Paste-link button** — 30×30, ghost (`--border-control`), link-chain icon.
    Toggles the paste row. Active = raised bg + `--border-strong`.
- **English-only.** There is no language toggle. EN is the single, default
  language; the DE/EN control and the `LANG_STORAGE_KEY` plumbing are removed.
  (Strings can stay in a map for future i18n, but ship EN only.)
- The old gear/settings button is **removed** — there are no user-facing settings
  anymore (token settings live only in the error state).

### Paste row (collapsible, hidden by default)
Shown when the paste button is toggled. `--bg-sunken`, bottom border.
Text input (placeholder "Paste Suno song link…") + solid-accent **Load** button.
Resolves a song from a pasted URL instead of the active tab: parse the `songId`
from the URL and route it through the existing `getLrcData()` path. An
invalid/unparseable URL shows an inline error (`bad_link`); the same input + Load
pair backs the empty state (§4).

---

## 3. Loaded state

### 3.1 Source card
Row, `14px 16px`, `gap 12px`.
- **Cover** 52×52, radius 9, gradient placeholder (replace with real `og:image` /
  CDN cover at runtime), subtle shadow.
- **Text block** (flex:1, min-width:0, ellipsis):
  - Title — 14px/600 `#fafafa` (e.g. "Airport").
  - Artist — 12px `#b5b5b5` ("by lukas.makesnoise").
  - Meta row (gap 8px, dot separators `#45454a`) — duration `2:31` and model `v4.5`,
    both 10.5px JetBrains Mono `#6e6e72`. *(Connection status is NOT shown here — it
    lives in the footer. Duration/model are nice-to-have; show only what metadata
    yields, omit silently otherwise.)*
- **ZIP button** (right, flex:none) — ghost, raised bg, download-arrow icon + "ZIP",
  11px/700. Opens the package panel (§3.2). Active = `--border-strong`.

### 3.2 Download-all package panel (collapsible)
`margin 0 16px 12px`, `--bg-sunken`, border, radius 12, padding 14.
- Header row: "Download package" (12px/600) + `Airport.zip` (mono, `--accent`).
- **Checklist** — 4 toggle rows, each: a 16×16 checkbox (checked = solid `--accent`
  with white tick; unchecked = transparent with `--border-strong` outline, no tick),
  label (12.5px `#e6e6ea`), and right-aligned mono caption with filename · size:
  - Lyrics — `Airport.lrc · 2 KB`
  - Audio — `Airport.mp3 · 4.8 MB`
  - Cover — `cover.jpg · 0.4 MB`
  - Video — `visualizer.mp4 · 12 MB`
  - All checked by default.
- **Primary button** (full width, solid accent): label is live —
  `Download ZIP · {n} files · ~{size}`. When `n == 0`, label becomes
  "Select at least 1 file" (button should be disabled in production).
- Sizes/names shown are illustrative — populate from real `Content-Length` / blobs.
- **Packaging:** fetch the selected asset blobs in the popup and build a single real
  `.zip` client-side with **fflate** (~8 KB, zero-dep) — not sequential downloads.
  Only checked items are included; an asset whose fetch fails is skipped (see §8 edge
  handling) rather than aborting the whole archive.
- **Lyrics in the ZIP:** the Lyrics item is always the **raw timed `.lrc`** (timestamps
  retained) for portability, independent of the lyrics-toolbar state (Timestamps/Clean/case).

### 3.3 Tabs
Row of 4 equal buttons, `0 16px 12px`, bottom border. Icon + label, 12px/600.
Inactive = transparent `#b5b5b5`; **active = `--bg-raised` bg, `#fafafa` text.**
Order: **Lyrics · Audio · Cover · Video**. Icons: list / waveform / image / play.

### 3.5a Audio preview player — behaviour
- **State:** `audioPlaying` (bool), `audioPos` (seconds). Production binds these to an
  `<audio>` element's `play()/pause()`, `timeupdate`→`currentTime`, and `duration`.
- **Transport:** play ↔ pause toggles the icon; reaching the end resets to paused.
- **Scrub:** clicking the waveform seeks (`currentTime = fraction * duration`); bars
  re-fill immediately. Drive progress from real time (not a per-tick accumulator) so
  the rate is correct and stray timers can't speed it up.
- **Waveform fidelity:** ideal = real peaks via Web Audio `decodeAudioData`; acceptable
  = fixed bar heights filled by real playback position. Never fake the *position*.

### 3.4 Lyrics tab
- **Toolbar** (`12px 16px 10px`, wrap, gap 6):
  - **Timestamps** toggle — chip with clock icon. Active = `--accent-weak-bg` +
    `--accent` border + `--accent-weak-text`. Toggles the `[mm:ss.xx]` prefix in the
    rendered lyrics (and governs whether copy/LRC includes timestamps).
  - **Clean** toggle — same chip style. Maps to existing `removePunct` option
    (`applyTextOptions`/`removePunctuation` in `textProcessing.ts`).
  - Spacer (flex:1).
  - **Case segment** — `Aa` / `A` / `a` on `--bg-raised`; active segment solid accent.
    Maps to existing `toUpper`/`toLower` (mutually exclusive; `Aa` = neither). Note
    these are independent of Clean and stack with it.
- **Lyrics box** — height 226, `margin 0 16px`, padding `12px 14px`, `--bg-sunken`,
  border, radius 11, scroll. JetBrains Mono 12px, line-height 1.55. Each line:
  timestamp span (`--accent`, .85 opacity, only if Timestamps on) + text (`#e6e6ea`).
  Custom scrollbar: 6px track transparent, thumb `#45454a` → `--accent` on hover.
- **Actions** (`12px 16px 16px`, gap 8):
  - **Copy lyrics** — primary, solid accent, flex 1.4, copy icon. (existing
    `copy_clipboard`.)
  - **`.lrc`** — secondary ghost, flex 1, download icon. Downloads the LRC file.
    *(Mental model: "Copy" = paste-elsewhere text; ".lrc" = the timed file.)*

### 3.5 Audio / Cover / Video tabs
Each: `padding 16px`, a preview block, optional mono caption, full-width
solid-accent download button.
- **Audio = preview player** (not a static graphic) — `--bg-sunken` card containing:
  a **clickable waveform** (~44 bars, varied heights, height ~60) where bars **fill
  with `--accent` up to the playback position** and the rest are `--border-strong`;
  clicking a bar **seeks**. Below: a 40px round accent **play/pause** button, a mono
  `current / total` readout (`0:00 / 2:31`, total in `--text-mut`), and the file
  name right-aligned. Then a mono caption `MP3 · 2:31 · ~4.8 MB` and the full-width
  **Download MP3** button. (Reference simulates playback with a timer; production uses
  an `<audio>` element — see Plan Phase 2 + §3.5a.)
- **Cover** — 200×200 centered artwork (radius 14, shadow); caption `JPG · 1024×1024`;
  **Download cover** button.
- **Video** — 16:10 visualizer preview, centered glass play button; caption overlay
  `visualizer.mp4 · 720p`; note "Visualizer video from Suno"; **Download video** button.

### 3.6 Footer (persistent)
Row, `9px 16px`, top border, `--bg-sunken`. Left only: 6px status dot + text.
- Loaded: dot `--ok`, "Connected via session token".
- Error: dot `--accent`, "Not connected".
The old "Token settings" footer button is **removed**.

---

## 4. Empty state
`padding 40px 28px 34px`, centered. 60×60 rounded-16 raised tile with muted
music-note icon; title "No Suno song detected" (15px/600); body "Open a song on
suno.com — or paste a song link to get started." (12.5px `#b5b5b5`, max-width 280);
paste input + solid-accent **Load** button; "Open suno.com →" text link (`--accent`).

## 5. Loading state
`padding 16px`. Skeleton shimmer (`linear-gradient(90deg,#242426,#303033,#242426)`,
1.2s loop): 52×52 cover + two text bars; a 34px toolbar bar; a 226px lyrics block.
Below: centered 14px spinner (accent top border) + "Fetching lyrics…".

## 6. Token error state
`padding 34px 28px`. 56×56 round accent-tint circle with warning triangle;
title "Couldn't read your session"; body "We couldn't find your Suno token. Make
sure you're signed in at suno.com."; **Reconnect** primary button (refresh icon) —
re-runs auto-detection (the only action most users need).

**Progressive disclosure — manual token fallback:** below Reconnect, a quiet text
button "Choose token source manually" with a chevron. Expanding it reveals:
- hint "Only change this if auto-detection picks the wrong token.",
- a `<select>` populated from the real `tokenOptions` (Automatic + each discovered
  path — see §7), and
- a "Retry with this source" button.
This is the **only** place the legacy token picker survives, and only after a failure.

---

## 7. Data, state & mapping to existing code

> **Refactor scope (in this feature):** alongside the visual overhaul, restructure the
> popup into an explicit state machine driving the `view`/`tab` state (see §7 UI state
> variables) with one module per view (loaded / empty / loading / error). This is the
> previously deferred popup state/view split. **Out of scope:** content-script,
> messaging, and build-pipeline cleanup — those stay as-is.

### Data already available (no new scraping needed)
From `src/content/` per the current `LrcDataResponse`:
- `songId`, `title`, `artist`
- `mediaUrls.image`, `mediaUrls.video` (cover + visualizer). **Audio MP3 URL:**
  extracted from the embedded Next.js JSON via the existing `metadata.ts` walk path
  (same source as duration/model) — not a hard-coded CDN pattern. Add it to
  `mediaUrls.audio` so the player, Download MP3, and ZIP audio all share one source.
- `lrcContent` (timed LRC from `aligned_lyrics/v2/`)
- `tokenOptions` / `tokenSelectedId` — feed the §6 manual fallback only.

`duration` and `model (v4.5)` shown on the Source card are **not** in the current
response — either extract them (they exist in the embedded Next.js JSON
`metadata.ts` already walks) or omit them. Don't block on them.

### UI state variables
| State | Type | Notes |
| --- | --- | --- |
| `view` | `loaded \| empty \| loading \| error` | top-level screen |
| `tab` | `lyrics \| audio \| cover \| video` | default `lyrics` |
| `timestamps` | bool | default **on** |
| `removePunct` (Clean) | bool | existing option; default per current behaviour |
| `caseMode` | `none \| upper \| lower` | maps to `toUpper`/`toLower` |
| `pasteOpen` | bool | top-bar paste row |
| `zipOpen` | bool | package panel |
| `zip.{lyrics,audio,cover,video}` | bool | include flags, all default true |
| `advancedOpen` | bool | manual token fallback (error state only) |

### Lyrics processing — reuse `textProcessing.ts`
- Clean → `removePunct`; case → `toUpper`/`toLower`; brackets always stripped
  (`removeBrackets`). `convertLrc` / `applyTextOptions` already implement this.
- **New:** a "timestamps off" rendering. `convertLrc` emits `[mm:ss.xx]text` lines;
  add a flag (or a post-step) to strip the leading `[..]` for display/copy when
  `timestamps` is off. Keep timestamps for the `.lrc` download regardless.

### Token flow — reuse `tokenDiscovery.ts` + `content/index.ts`
- Keep `getBearerTokenFromBrowser()` (3 paths → candidates) and the auto-try loop in
  `getLrcData()` exactly as-is. **UI change only:** don't render the picker on
  success. On failure (`lrcContent == null` with options present), show the §6 error
  + expose `tokenOptions` in the fallback `<select>`; "Retry with this source" calls
  `GET_LRC_DATA` with the chosen `tokenOptionId` (already supported).
- **Paste-by-URL:** the Load button (top bar §2 + empty state §4) parses the `songId`
  from the pasted Suno URL and calls the same `GET_LRC_DATA` path with that id instead
  of the active tab's. Unparseable input shows the inline `bad_link` error; no new
  scraping path is added.

### i18n
Ship **English only** — no DE/EN toggle, no `LANG_STORAGE_KEY`. Keep copy in one
place (a simple strings map is fine for future-proofing, but render EN). New/updated
strings (EN):
`connected` "Connected", `connected_via` "Connected via session token",
`not_connected` "Not connected", `timestamps` "Timestamps", `clean` "Clean",
`copy_lyrics` "Copy lyrics", `download_mp3`/`download_cover`/`download_video`,
`tab_lyrics/audio/cover/video`, `empty_title` "No Suno song detected", `empty_body`,
`open_suno` "Open suno.com", `loading_text` "Fetching lyrics…", `error_title`
"Couldn't read your session", `error_body`, `reconnect` "Reconnect", `try_other`
"Choose token source manually", `retry_with` "Retry with this source",
`paste_placeholder` "Paste Suno song link…", `load` "Load", `download_all`
"Download all as ZIP", `package_title` "Download package", `zip_nothing`
"Select at least 1 file", `zip_download` "Download ZIP", `asset_failed`
"Couldn't fetch this file", `bad_link` "That doesn't look like a Suno link".
> The current `i18n.ts` map contains profane placeholder strings — replace those.
> Note: the current i18n map contains profane placeholder strings — replace those.

---

## 8. Edge cases & error handling

**Asset fetch failures (per-asset graceful degradation):**
- **ZIP package:** an asset whose blob fetch fails is **skipped**; the archive still
  builds with the remaining selected items. Never abort the whole `.zip` on one
  failure. If *every* selected asset fails, surface a single inline error and produce
  no download.
- **Single-download buttons** (Download MP3 / cover / video, `.lrc`): on fetch
  failure, show an **inline error** on/near the button; do not crash the view.
- **Known-unavailable assets:** when metadata indicates an asset is absent (e.g. no
  `mediaUrls.audio`/`video`), **disable** its tab control, ZIP checklist row, and
  download button rather than letting the user trigger a guaranteed failure. This
  extends the existing "show only what metadata yields, omit silently" stance.
- New EN string: `asset_failed` — short inline failure message (e.g. "Couldn't fetch
  this file").

---

## 9. Accessibility (minimal baseline)

In scope this feature:
- **Visible focus** state on every interactive control (do not remove outlines;
  style a clear focus ring from a token).
- **Keyboard operability** for the primary actions: tab switching, Copy lyrics,
  `.lrc`, all Download buttons, ZIP Download, paste **Load**, and **Reconnect**.

Deferred to a later a11y pass (explicitly out of scope now): full `aria-label`s on
icon-only buttons, `tablist`/`tab` roles, audio player ARIA, and
`prefers-reduced-motion` handling for the shimmer/waveform. WCAG AA contrast is a
nice-to-have given the dark palette but not formally audited this feature.
