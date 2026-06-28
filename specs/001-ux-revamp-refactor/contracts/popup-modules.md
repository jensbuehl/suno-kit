# Contract — Internal popup module APIs

Feature: Popup UX Revamp & Refactor (001). These are the internal interfaces created by the
state/view refactor. Keep them small and pure where possible (constitution I/II); the views
own DOM, the helpers stay testable.

---

## `src/popup/state.ts` ➕

The single UI-state model + pure transitions (no DOM).

```ts
export type View = 'loaded' | 'empty' | 'loading' | 'error';
export type Tab = 'lyrics' | 'audio' | 'cover' | 'video';
export type CaseMode = 'none' | 'upper' | 'lower';

export interface PopupState {
    view: View;
    tab: Tab;
    timestamps: boolean;
    removePunct: boolean;
    caseMode: CaseMode;
    pasteOpen: boolean;
    zipOpen: boolean;
    zip: { lyrics: boolean; audio: boolean; cover: boolean; video: boolean };
    advancedOpen: boolean;
}

export function initialState(): PopupState;
// Pure updates return a new state; the router re-renders on change.
export function setView(s: PopupState, v: View): PopupState;
export function setTab(s: PopupState, t: Tab): PopupState;
export function toggleTimestamps(s: PopupState): PopupState;
export function setCaseMode(s: PopupState, m: CaseMode): PopupState;
export function toggleZipItem(s: PopupState, k: keyof PopupState['zip']): PopupState;
// …etc. for the remaining toggles.
```

Contract: pure functions, no `chrome.*`/DOM. Unit-testable (optional).

---

## `src/popup/textProcessing.ts` ✏️

Add timestamps-off rendering; do **not** change `convertLrc`'s signature.

```ts
/** Strips a leading [mm:ss.xx] from each line. For display/copy when timestamps are off. */
export function stripTimestamps(lrc: string): string;
```

Contract: pure; `.lrc` download path never calls it (file stays timed). Unit-tested
(`tests/textProcessing.test.ts`).

---

## `src/popup/songUrl.ts` ➕

```ts
/** Returns the songId from a pasted Suno URL, or null if it isn't a recognizable one. */
export function parseSongId(input: string): string | null;
```

Contract: pure; accepts full URLs and bare ids; tolerant of query/hash/trailing slash.
Unit-tested (`tests/songUrl.test.ts`). Null ⇒ caller shows `bad_link`.

---

## `src/popup/zip.ts` ➕

```ts
export interface ZipItem { name: string; bytes: Uint8Array; }

/** Pure: which assets to include + their archive filenames, from state + song. */
export function buildManifest(args: {
    selection: { lyrics: boolean; audio: boolean; cover: boolean; video: boolean };
    title: string;
    lrcContent: string;
    mediaUrls: { image?: string; video?: string; audio?: string };
}): { lyrics?: { name: string; text: string }; fetch: { key: string; name: string; url: string }[] };

/** Assemble a .zip blob from already-fetched items via fflate. */
export function makeZipBlob(items: ZipItem[]): Blob;
```

Contract: `buildManifest` is pure (unit-tested, `tests/zip.test.ts`); `makeZipBlob` wraps
fflate. Network fetches happen in the caller via `FC_FETCH_ASSET`; failed assets are
omitted from `items` (§8).

---

## `src/popup/views/*` ➕

Each view exports a render function that mounts into the shell and wires events against the
current state, plus a small `props` of the data it needs. No view reads `chrome.*` directly
beyond what the bootstrap passes in (keeps views focused on DOM).

```ts
// loaded.ts
export function renderLoaded(root: HTMLElement, props: LoadedProps): void;
// empty.ts
export function renderEmpty(root: HTMLElement, props: EmptyProps): void;
// loading.ts
export function renderLoading(root: HTMLElement): void;
// error.ts
export function renderError(root: HTMLElement, props: ErrorProps): void;
// audioPlayer.ts
export function mountAudioPlayer(root: HTMLElement, audioUrl: string, totalLabel?: string): void;
```

Contract: `popup.ts` is the only place that talks to `chrome.tabs`/`chrome.runtime` and
calls the renderers based on `state.view`. Re-render is full-view replace (simple; the popup
is small).

---

## Reused (unchanged) modules — do not duplicate

- `src/content/index.ts` `getLrcData` (extend signature for explicit `songId` only).
- `src/content/tokenDiscovery.ts`, `src/content/sunoApi.ts`, `src/content/lrc.ts`.
- `src/popup/textProcessing.ts` `convertLrc`/`applyTextOptions`/`cleanFilename`/`addVizzyWorkaround`.
- The existing `downloadMedia`/clipboard/`checkVideoAvailability` logic (relocated into
  views, not rewritten).
