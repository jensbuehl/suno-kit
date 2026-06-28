# Contract — Cross-context messaging

Feature: Popup UX Revamp & Refactor (001). The extension has three contexts: **popup**,
**content script**, **background service worker**. These message contracts are the
boundaries; types live in `src/shared/types.ts`.

Legend: 🔁 = existing (keep), ➕ = new this feature, ✏️ = extended this feature.

---

## 1. Popup → Content: `GET_LRC_DATA` ✏️

Resolve lyrics + media for a song.

**Request**

```ts
interface GetLrcDataRequest {
    action: 'GET_LRC_DATA';
    tokenOptionId?: string; // 🔁 'auto' | a discovered candidate id (manual fallback)
    songId?: string;        // ➕ explicit id for paste-by-URL; when absent, content uses window.location
}
```

**Response** (`LrcDataResponse`)

```ts
interface LrcDataResponse {
    songId: string | null;
    title?: string;
    artist?: string;
    mediaUrls?: MediaUrls | null; // MediaUrls now includes optional `audio` ✏️
    duration?: string;            // ➕ optional, best-effort
    model?: string;               // ➕ optional, best-effort
    tokenDebugPath: string;       // 🔁 used only for the error-view fallback now
    tokenOptions: TokenOption[];  // 🔁 manual fallback list
    tokenSelectedId: string;
    lrcContent?: string | null;   // null ⇒ popup routes to error view
    error?: string;               // e.g. 'Not on a song page'
}
```

**Behavior contract**
- Success ⇒ `lrcContent` non-null; popup → `loaded`.
- `lrcContent == null` with `tokenOptions` present ⇒ popup → `error` (manual fallback).
- `error === 'Not on a song page'` and no `songId` provided ⇒ popup → `empty`.
- `songId` provided (paste flow) ⇒ content resolves that song regardless of the active URL.
  *(Implementation: extend `getLrcData(preferredOptionId, songId?)` to take an explicit id
  instead of always reading `window.location`.)*
- Content script is injected on demand if not present (existing `sendLrcRequest` retry).

---

## 2. Content → Background: `FC_GET_SUNO_COOKIES` 🔁

Unchanged. Background returns Suno cookies for token discovery.

```ts
interface GetCookiesRequest { action: 'FC_GET_SUNO_COOKIES'; domains?: string[]; }
interface GetCookiesResponse { cookies: chrome.cookies.Cookie[]; error?: string; }
```

---

## 3. Popup → Background: `FC_FETCH_ASSET` ➕

Fetch binary media (audio/cover/video) as bytes, to sidestep popup-context CORS when
building the ZIP. One privileged egress point.

**Request**

```ts
interface FetchAssetRequest {
    action: 'FC_FETCH_ASSET';
    url: string;
}
```

**Response**

```ts
interface FetchAssetResponse {
    ok: boolean;
    bytes?: ArrayBuffer;   // present when ok
    contentType?: string;
    contentLength?: number;
    error?: string;        // present when !ok (asset skipped, not fatal — §8)
}
```

**Behavior contract**
- Network/HTTP failure ⇒ `{ ok: false, error }`; caller **skips** that asset and continues
  (per spec §8). Never throws across the boundary.
- Used by `popup/zip.ts`. Single-asset download buttons may reuse it or keep the existing
  `chrome.downloads.download` path (which needs no broker).
- Confirm the CDN origin is covered by `host_permissions` in `manifest.json`; add it only
  if a fetch is actually blocked.

---

## 4. Content → Popup: `VIDEO_INVALID` 🔁

Existing notification that a video URL turned out unplayable; popup disables the Video
asset. Keep, mapped to the new §8 disable behavior.
