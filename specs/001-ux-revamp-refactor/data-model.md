# Phase 1 — Data Model

Feature: Popup UX Revamp & Refactor (001). The "data" here is (a) the in-memory **UI
state** of the popup and (b) the **message/data shapes** exchanged with the content and
background scripts. No persistent storage is added (the language preference is removed).

---

## 1. UI State (in-memory, per popup open)

Source: spec §7. Lives in `src/popup/state.ts` as one object with pure transition helpers.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `view` | `'loaded' \| 'empty' \| 'loading' \| 'error'` | `'loading'` | top-level screen |
| `tab` | `'lyrics' \| 'audio' \| 'cover' \| 'video'` | `'lyrics'` | active tab when loaded |
| `timestamps` | `boolean` | `true` | LRC `[mm:ss.xx]` prefix in render + copy |
| `removePunct` | `boolean` | per current behavior | Clean toggle → `applyTextOptions` |
| `caseMode` | `'none' \| 'upper' \| 'lower'` | `'none'` | maps to `toUpper`/`toLower` (mutually exclusive) |
| `pasteOpen` | `boolean` | `false` | top-bar paste row visible |
| `zipOpen` | `boolean` | `false` | package panel visible |
| `zip.lyrics` | `boolean` | `true` | include flag |
| `zip.audio` | `boolean` | `true` | include flag |
| `zip.cover` | `boolean` | `true` | include flag |
| `zip.video` | `boolean` | `true` | include flag |
| `advancedOpen` | `boolean` | `false` | manual token fallback (error view only) |

### Derived / transient (not persisted, may live beside state or in the loaded song model)

- `bad_link` error visibility (paste parse failure) — transient.
- `asset_failed` inline error per download button — transient.
- ZIP button label: derived from selected `zip.*` + known sizes →
  `Download ZIP · {n} files · ~{size}` (or "Select at least 1 file" when `n == 0`).
- Audio: `audioPlaying: boolean`, `audioPos: seconds` — driven by the `<audio>` element
  (real `currentTime`/`duration`), not a timer.

### State transitions (high level)

```
            initial
              │ GET_LRC_DATA (active tab or pasted songId)
              ▼
          [loading]
        ┌────┴───────────────┐
 lrcContent != null     lrcContent == null
        ▼                    ▼
     [loaded]            [error]  ──Reconnect / Retry-with-source──► [loading]
        ▲                    
 not on /song/ &&           
 no pasted id               
        ▼                    
      [empty] ──Load(valid URL)──► [loading]
              └─Load(bad URL)──► [empty] + bad_link
```

---

## 2. Song data model (loaded view)

Held in the popup after a successful `GET_LRC_DATA`. Derived from `LrcDataResponse`.

| Field | Type | Source |
| --- | --- | --- |
| `songId` | `string` | response |
| `title` | `string` | response (fallback "Unknown Title") |
| `artist` | `string` | response (fallback "Unknown Artist") |
| `lrcContent` | `string` | response (raw timed LRC) |
| `mediaUrls.image` | `string` | response |
| `mediaUrls.video` | `string` | response |
| `mediaUrls.audio` | `string?` | **NEW** — response (from embedded JSON) |
| `duration` | `string?` | **NEW (optional)** — embedded JSON; omit if absent |
| `model` | `string?` | **NEW (optional)** — embedded JSON; omit if absent |
| `tokenOptions` | `TokenOption[]` | response — error-view manual fallback only |
| `tokenSelectedId` | `string` | response |

### Type changes (`src/shared/types.ts`)

```ts
export interface MediaUrls {
    image: string;
    video: string;
    audio?: string; // NEW — extracted from embedded Next.js JSON
}

export interface SongMetadata {
    title: string;
    artist: string;
    mediaUrls: MediaUrls;
    duration?: string; // NEW (optional)
    model?: string;    // NEW (optional)
}

// LrcDataResponse gains the same optional duration?/model? passthrough.
```

Validation/rules:
- An asset is **available** iff its URL is present *and* (for video) `checkVideoAvailability`
  passes. Unavailable assets → disabled tab control, ZIP row, and download button (§8).
- `duration`/`model` are best-effort; never block load on them (spec §7).

---

## 3. ZIP package model

Built in `src/popup/zip.ts` from the selected `zip.*` flags + the song model.

| Manifest entry | Included when | Filename in archive | Bytes source |
| --- | --- | --- | --- |
| Lyrics | `zip.lyrics` | `{cleanTitle}.lrc` | in-memory raw timed `lrcContent` |
| Audio | `zip.audio` && `mediaUrls.audio` | `{cleanTitle}.mp3` | broker fetch |
| Cover | `zip.cover` && `mediaUrls.image` | `cover.jpg` | broker fetch |
| Video | `zip.video` && `mediaUrls.video` (reachable) | `visualizer.mp4` | broker fetch |

Rules:
- `{cleanTitle}` = `cleanFilename(title)` (reuse `textProcessing.ts`).
- Archive name: `{cleanTitle}.zip`.
- A failed/absent asset is **skipped**, not fatal (§8). If all selected fail → no download
  + one inline error.
- Sizes for the button estimate: `Content-Length` (HEAD) when available, else computed
  from fetched buffers before the final download.

---

## 4. i18n strings (English-only)

`src/popup/i18n.ts` collapses to a single EN map (no `Lang`/`LANGS`). Keys per spec §7,
including new: `asset_failed`, `bad_link`, plus the revamp keys (`timestamps`, `clean`,
`copy_lyrics`, `download_*`, `tab_*`, `empty_*`, `open_suno`, `loading_text`, `error_*`,
`reconnect`, `try_other`, `retry_with`, `paste_placeholder`, `load`, `download_all`,
`package_title`, `zip_nothing`, `zip_download`). The profane placeholders are removed.
