# SUNO Copilot

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

The extension has the three standard MV3 contexts:

| File | Role |
| --- | --- |
| `manifest.json` | MV3 configuration. |
| `background.js` | Service worker. Reads Suno auth cookies via `chrome.cookies` on request (content scripts cannot read HttpOnly cookies directly). |
| `contentScript.js` | Runs on `suno.com`. Discovers a bearer token from cookies/localStorage, calls Suno's `aligned_lyrics` API, and scrapes title/artist/media URLs from the page. |
| `popup.html` / `popup.js` | UI. Formats the LRC, applies cleaning options, and triggers downloads. |

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
| `host_permissions: suno.com, auth.suno.com` | Fetch lyrics/media and read auth cookies. |

## Development

Requires Node.js 18+.

```bash
npm install        # install dev tooling (ESLint, Prettier)
npm run lint       # lint all JS
npm run format     # format with Prettier
```

### Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. After changing code, click the reload icon on the extension card. Suno tabs
   opened before the reload are handled automatically by on-demand injection.

## License

Private project. All rights reserved.
