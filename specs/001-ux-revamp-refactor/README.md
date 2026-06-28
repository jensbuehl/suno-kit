# Handoff: SUNO Copilot — Popup UX Overhaul

A redesign of the SUNO Copilot Chrome extension popup (`src/popup/`), reorganising
it around a **Detect → Confirm → Act** flow, hiding token-discovery internals, and
adding a **Download-all-as-ZIP** package action.

This bundle is a **design reference**, not production code. See `spec.md` for the
authoritative component/interaction spec and `plan.md` for the
phased build order against the existing TypeScript codebase.

## Layout (Spec Kit)
This folder follows the Spec Kit convention — `specs/001-ux-revamp-refactor/`:
- `spec.md` — the specification (`/speckit-specify`)
- `plan.md` — the implementation plan (`/speckit-plan`)
- `tasks.md` — task breakdown, added later by `/speckit-tasks`
- `design/` — design references this spec points to (interactive HTML, token
  sheet, DC source, state screenshots). Not part of the Spec Kit templates;
  kept here so the spec is self-contained.

---

## What's in this folder

| File | What it is |
| --- | --- |
| `spec.md` | Full design spec — every screen, component, token, interaction, state. **Start here.** |
| `design/theme.css` | **Centralized design tokens** — the single source of truth for colours/spacing/type/radii, with three worked themes (dark/ember/mono). Re-theming = override one block. |
| `plan.md` | Phased plan mapping the design onto the real `src/` files, with the new APIs needed. |
| `design/SUNO-Copilot-reference.html` | **Self-contained, interactive** reference. Open in any browser. Use the "Demo state" toggle at the top to flip Loaded / Empty / Loading / Token error; tabs, toolbar, ZIP picker, and language toggle all work. This is the source of truth for look & behaviour. |
| `design/SUNO Copilot.dc.html` | The design-component source for the reference (not needed to implement; included for completeness). |
| `design/screens/` | High-res screenshots of each state (see legend below). |

### Screenshot legend
- `01-loaded-lyrics.png` — default loaded state, Lyrics tab
- `02-audio-player.png` — Audio tab: preview player (play/pause, scrubber, waveform fills with playback)
- `03-cover-tab.png` — Cover tab (artwork preview + Download cover)
- `04-video-tab.png` — Video tab (visualizer preview + Download video)
- `05-zip-package.png` — Download-all package picker (opened from the ZIP button)
- `06-empty-state.png` — no song detected / paste-a-link
- `07-token-error.png` — token failure with manual fallback expanded
- `08-ember-theme.png` — the "Ember" theme, showing tokens re-theme the whole UI from one block

---

## Fidelity

**High-fidelity.** Colours, type, spacing, radii and copy are final. Recreate the UI
in the extension's existing vanilla-TS + DOM popup (no framework is introduced —
keep `popup.ts` rendering the DOM as it does today). The reference HTML is built with
a component runtime for prototyping only; **do not** port that runtime — port the
*markup, styles, and behaviour* it expresses.

## The core UX changes (why this exists)

1. **Token discovery becomes invisible.** Today the popup shows a "Token Erkennung"
   `<select>` with "Auto / Alternative 1–N" and a raw cookie-source debug string.
   Users should never choose a token path. Auto-detection runs silently; the manual
   picker only appears **after** auto-resolve fails, inside the error state.
2. **A Source card** confirms *which* song was detected (cover, title, artist,
   duration, model) — using metadata the content script already returns.
3. **Tabbed content** (Lyrics / Audio / Cover / Video) replaces the flat 5-button
   row. Each tab previews its asset and carries its own primary download.
4. **Lyrics toolbar** gains a **Timestamps on/off** toggle (LRC vs. plain copy),
   plus Clean and a case segment — all non-destructive/stackable.
5. **Download all as ZIP** — a song-level package action on the Source card, with a
   checklist of what to include and a live count/size on the button.
6. **Explicit Empty / Loading / Error states** the current popup lacks.
7. **Centralized, themeable tokens** — all colours/type/spacing live in `design/theme.css`;
   components reference `var(--sc-*)` only, so themes swap by overriding one block.
8. **English-only** — the DE/EN toggle is removed (EN is the default).

See `spec.md` for the precise definition of each.
