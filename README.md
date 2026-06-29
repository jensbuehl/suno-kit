# SunoKit

> **v1.0.0** — first stable release.

A Chrome (Manifest V3) extension that downloads **timed lyrics (`.lrc`)**, **audio**,
**cover art**, and **video** from [Suno](https://suno.com) songs — from **any** tab,
not just an open Suno page.

> Private/self-hosted extension. Not published on the Chrome Web Store.

## Features

- **Works from any tab.** Loads the song three ways, in priority order:
  1. a **pasted/dropped** Suno song link,
  2. the **active** Suno song tab (auto-loads on open),
  3. a Suno song open in a **background** tab (picked from a list when several are open).
- **Time-aligned lyrics → LRC**, with:
  - **Trim** — drop boilerplate lines around the lyrics (start after / end before a line
    containing a marker, e.g. a URL or a `©` line); activate/deactivate without losing your
    settings, which persist across sessions.
  - **Clean** — remove brackets (always), strip punctuation/emoji, UPPERCASE / lowercase.
  - **Timestamps** toggle for the on-screen/Copy view (the `.lrc` download stays timed).
- **Downloads** — LRC, MP3, cover image, and visualizer video individually, or **all as a
  single ZIP**.
- **Audio preview** player in the popup.
- **Tab-independent auth.** Uses your signed-in Suno session token, read from the browser's
  cookie jar; if it has gone stale it is refreshed from any open Suno tab.

## Usage

1. **Sign in to Suno** in the same browser at least once.
2. Click the **SunoKit** toolbar icon.
3. **Load a song:**
   - On a Suno song page → it loads automatically.
   - On any other tab → click the **link** button in the top bar (or use the input on the
     empty screen) and **paste/drop a Suno song link**, then **Load**. If you have Suno songs
     open in other tabs, pick one from the list instead.
   - To switch songs, click the **source chip** on the loaded card (it's prefilled with the
     current link) and load a different one.
4. **Lyrics tab** — toggle **Timestamps / Clean / case**, open **Trim** (`⌄`) to drop
   boilerplate lines, then **Copy lyrics** or download **`.lrc`**.
5. **Audio / Cover / Video tabs** — preview, then download.
6. **ZIP** — pick which assets to include and download them as one archive.

If the token can't be read or has expired and no Suno tab is open to refresh it, the popup
shows a clear **Reconnect** path (open/refresh Suno and retry).

## How it works

Everything runs in the **popup**, which carries the extension's host permissions and can read
cookies, fetch Suno's API/pages, and query/inject tabs — so no content script is needed.
Source lives in `src/` (TypeScript) and is bundled into `dist/` by esbuild:

| Source | Built file | Role |
| --- | --- | --- |
| `src/popup/*` | `dist/popup.js` + `popup.html` / `.css` | UI **and** orchestration: resolves the song, reads the token, fetches lyrics + media, applies trim/clean, and triggers downloads (`loadSong`, `songSource`, `sunoTabs`, `tokenRefresh`). |
| `src/background/index.ts` | `dist/background.js` | Service worker. Reads Suno auth cookies (incl. HttpOnly) via `chrome.cookies` on request — the only API the popup can't call for HttpOnly cookies itself. |
| `src/shared/*` | — | Pure, testable logic + typed message contracts: `songUrl`, `songMetadata`, `loadError`, `tokenDiscovery`, `sunoApi`, `lrc`, `settings`, `types`. |

**Load flow:** the popup resolves a `SongRef` (pasted link → active tab → background tab),
reads bearer-token candidates from the cookie jar (via the background broker), calls Suno's
`aligned_lyrics` API until one works, then fetches the song page and parses title/artist/media
URLs. On a `401` it mints a fresh token from an open Suno tab (MAIN-world
`Clerk.session.getToken()`) and retries once; otherwise it surfaces a specific error
(invalid link / not signed in / session expired / song inaccessible / offline).

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the active tab's URL to detect a Suno song. |
| `cookies` | Read the Suno session cookie used as the API bearer token. |
| `downloads` | Save the LRC / MP3 / cover / video / ZIP files. |
| `scripting` | Inject a tiny MAIN-world snippet into an open Suno tab to mint a fresh token. |
| `storage` | Persist UI settings (lyrics trim rules). |
| `host_permissions` (`suno.com`, `auth.suno.com`, …) | Fetch lyrics/media/pages and read auth cookies — tab-independently. |

## Development

Requires Node.js 18+.

```bash
npm install        # install dev tooling (esbuild, TypeScript, ESLint, Prettier, Vitest)
npm run build      # bundle src/ -> dist/
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run test       # Vitest unit tests (pure logic)
npm run check      # typecheck + lint + test
npm run format     # format with Prettier
```

Unit tests under `tests/` cover the pure logic: song-link parsing, song-page metadata
extraction, error classification, lyrics trim, LRC conversion, text cleaning, and JWT
detection.

### Load the extension

1. Run `npm run build` (or `npm run watch`) to produce `dist/`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **`dist/`** folder.
5. After changing code, rebuild (or keep `npm run watch` running) and click the **reload**
   icon on the extension card.

## License

Private project. All rights reserved.
