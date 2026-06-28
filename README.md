# SUNO Copilot

> ⚠️ **Heavily WIP (v0.0.9).** Structure and APIs are still changing.

A Chrome (Manifest V3) extension that downloads **timed lyrics (`.lrc`)**, **audio**,
**cover art**, and **video** from [Suno](https://suno.com) song pages, with optional
text cleaning of the lyrics.

> Private/self-hosted extension. Not published on the Chrome Web Store.

## Features

- Fetches time-aligned lyrics for the current Suno song and renders them as LRC.
- Lyric cleaning options: remove brackets (always), strip punctuation/emoji,
  UPPERCASE / lowercase.
- One-click download of LRC, MP3, cover image, and visualizer video.
- DE/EN interface.
- "Token discovery" picker: lyrics are fetched from Suno's API using your own
  signed-in session token, discovered automatically from cookies / localStorage,
  with manual fallback paths if auto-detection picks the wrong one.

## How it works

The extension has the three standard MV3 contexts. Source lives in `src/`
(TypeScript) and is bundled into `dist/` by esbuild:

| Source | Built file | Role |
| --- | --- | --- |
| `src/background/index.ts` | `dist/background.js` | Service worker. Reads Suno auth cookies via `chrome.cookies` on request (content scripts cannot read HttpOnly cookies directly). |
| `src/content/*.ts` | `dist/contentScript.js` | Runs on `suno.com`. Discovers a bearer token (`tokenDiscovery`), calls Suno's `aligned_lyrics` API (`sunoApi`), formats it (`lrc`), and scrapes metadata (`metadata`). |
| `src/popup/popup.ts` + `popup.html` / `popup.css` | `dist/popup.js` + html/css | UI. Formats the LRC, applies cleaning options, and triggers downloads. |
| `src/shared/types.ts` | — | Typed message contracts shared across all three contexts. |

Flow: the popup sends `GET_LRC_DATA` to the content script, which tries each
token candidate until one returns lyrics, then responds with the LRC and media
URLs. If the content script is not yet present (e.g. right after the extension
was reloaded), the popup injects it on demand via `chrome.scripting`.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Message / inject into the active Suno tab on user action. |
| `cookies` | Read the Suno session cookie used as the API bearer token. |
| `downloads` | Save the LRC / MP3 / cover / video files. |
| `scripting` | Inject the content script on demand when it isn't already loaded. |
| `storage` | Persist the selected UI language. |
| `host_permissions: suno.com, auth.suno.com` | Fetch lyrics/media and read auth cookies. |

## Development

Requires Node.js 18+.

```bash
npm install        # install dev tooling (esbuild, TypeScript, ESLint, Prettier)
npm run build      # bundle src/ -> dist/
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run check      # typecheck + lint
npm run format     # format with Prettier
```

### Load the extension

1. Run `npm run build` (or `npm run watch`) to produce `dist/`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **`dist/`** folder.
5. After changing code, rebuild (or keep `npm run watch` running) and click the
   reload icon on the extension card. Suno tabs opened before the reload are
   handled automatically by on-demand injection.

## License

Private project. All rights reserved.
