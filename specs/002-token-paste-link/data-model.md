# Phase 1 Data Model — Tab-Independent Song Loading & Paste-a-Link

All types live in `src/shared/types.ts` unless noted. No persisted storage — these are
in-memory/message shapes.

## SongRef (new)

A resolved pointer to one Suno song and where it came from.

| Field | Type | Notes |
|-------|------|-------|
| `songId` | `string` | Suno song identifier (validated, non-empty) |
| `source` | `'paste' \| 'active-tab' \| 'background-tab'` | Drives precedence + messaging (FR-008) |
| `sourceUrl` | `string \| undefined` | Original URL when from paste/tab (for display/debug) |

Resolution precedence (highest first): `paste` → `active-tab` → `background-tab`.
Multiple background song tabs with no paste ⇒ unresolved → popup shows a chooser.

## TokenCandidate / TokenOption (reused, unchanged)

From `src/shared/tokenDiscovery.ts` (moved from `content/`). Only the `chrome.cookies`
(Weg 1) discovery remains; `document.cookie`/`localStorage` candidates are removed.

| Type | Field | Notes |
|------|-------|-------|
| `TokenCandidate` | `token`, `source`, `path` | A bearer JWT found in the cookie jar |
| `TokenOption` | `id`, `label`, `index` | Selectable source shown in the manual-source fallback |

## SongResult (assembled in the popup)

The loaded-song model the existing views already consume (`popup/song.ts#SongModel` shape).
Now assembled by `popup/loadSong.ts` from API + parsed metadata instead of by the content
script. No shape change to the views.

| Field | Type | Source |
|-------|------|--------|
| `songId` | `string` | `SongRef` |
| `title`, `artist` | `string` | parsed page HTML (`shared/songMetadata.ts`) |
| `lrcContent` | `string` | `aligned_lyrics` → `alignedWordsToLrc` |
| `image` / `video` / `audio` | `string?` | parsed HTML; CDN-pattern fallback |
| `duration` / `model` | `string?` | parsed HTML (best-effort) |

## LoadError (new — discriminated union)

Produced by `shared/loadError.ts#classifyLoadError`; consumed by `views/error.ts`.

| `kind` | Meaning | i18n message key (new) |
|--------|---------|------------------------|
| `bad-link` | Pasted input is not a valid Suno song link | `err_bad_link` |
| `not-signed-in` | No token candidates exist in the cookie jar | `err_not_signed_in` |
| `session-expired` | Candidates exist but all 401/403 and no refresh available | `err_session_expired` |
| `song-inaccessible` | Specific song 404/403 while token otherwise works | `err_song_inaccessible` |
| `offline` | Network/fetch failure | `err_offline` |
| `unknown` | Fallback | `err_unknown` |

```ts
export type LoadError =
  | { kind: 'bad-link' }
  | { kind: 'not-signed-in' }
  | { kind: 'session-expired'; canRefresh: boolean }
  | { kind: 'song-inaccessible' }
  | { kind: 'offline' }
  | { kind: 'unknown'; detail?: string };
```

## GetLrcDataRequest (edit)

Add optional `songId` so any residual content-script use can target an explicit song; the
popup-orchestrated path does not require it.

```ts
export interface GetLrcDataRequest {
  action: 'GET_LRC_DATA';
  tokenOptionId?: string;
  songId?: string; // NEW — explicit target; absent ⇒ legacy active-tab behavior
}
```

## Popup view-state transitions (additions)

`PopupState.view` (`loaded | empty | loading | error`) is unchanged; new **entry points**
feed it:

```
open popup
  └─ resolve SongRef (paste? active tab? background tab?)
       ├─ resolved   → loading → loadSong() → loaded | error(LoadError)
       ├─ none, can paste → empty (with functional paste input)   ← no longer a dead end
       └─ ambiguous (multi bg tab) → empty + chooser

paste/drop a link (from empty or top-bar control)
  └─ parseSongId
       ├─ ok  → loading → loadSong() → loaded | error
       └─ null → inline err_bad_link (stay on current view)

error(session-expired, canRefresh) → Reconnect
  └─ mint via live Suno tab → retry loadSong() → loaded | error
```

## Entity relationships

```
SongRef ──(songId)──▶ loadSong()
                         ├─▶ tokenDiscovery → TokenCandidate[] (cookie jar)
                         ├─▶ aligned_lyrics(token) → lrcContent
                         └─▶ songPageHtml → songMetadata → title/artist/media
                         ⇒ SongResult  |  LoadError
```
