// Popup bootstrap + view router. This is the ONLY module that talks to chrome.*
// (tabs / runtime / downloads); the views are pure DOM and call back through the
// PopupActions object implemented here. Re-render is a full-view replace (the
// popup is small) — see contracts/popup-modules.md.

import { logger } from '../shared/logger';
import { type Settings, loadSettings, saveSettings } from '../shared/settings';
import { parseSongId } from '../shared/songUrl';
import type { LoadError, SongRef, TokenOption } from '../shared/types';
import { t } from './i18n';
import { icon } from './icons';
import { type LoadOutcome, loadSong } from './loadSong';
import { lrcFileText, renderedLyrics } from './lyrics';
import type { PopupActions, SongModel } from './song';
import { querySunoSongTabs, resolveInitialRef } from './songSource';
import {
    type CaseMode,
    type PopupState,
    type Tab,
    type ZipSelection,
    initialState,
    setCaseMode,
    setTab,
    setTrim,
    setView,
    toggleAdvanced,
    toggleClean,
    toggleTimestamps,
    toggleTrimOpen,
    toggleZipItem,
    toggleZipOpen
} from './state';
import { cleanFilename } from './textProcessing';
import { type ZipItem, buildManifest, makeZipBlob } from './zip';
import { renderEmpty } from './views/empty';
import { renderError } from './views/error';
import { lyricsLinesHtml, renderLoaded } from './views/loaded';
import { renderLoading } from './views/loading';

// --- Module state -----------------------------------------------------------
let state: PopupState = initialState();
let song: SongModel | null = null;
let tokenOptions: TokenOption[] = [];
let tokenSelectedId = 'auto';
let loadError: LoadError | null = null;
let currentRef: SongRef | null = null;
let pasteOpen = false;
let bgSongTabs: SongRef[] = [];
let zipBuilding = false;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

// --- Shell (persistent top bar + footer) ------------------------------------

function topbarHtml(): string {
    return `
        <div class="topbar">
            <div class="wordmark">
                <img class="brand-mark" src="public/icon128.png" alt="" />
                <span class="brand-name">${t('brand_sun')}<span class="brand-co">${t('brand_co')}</span></span>
            </div>
            <div class="topbar-actions">
                <button class="icon-btn" id="pasteToggle" type="button"
                    aria-pressed="${pasteOpen}" aria-label="${t('paste_toggle')}" title="${t('paste_toggle')}">
                    ${icon('link', 16)}
                </button>
            </div>
        </div>
        ${pasteOpen ? pasteRowHtml() : ''}
    `;
}

/** Canonical Suno URL for the loaded song (prefilled into the override input). */
function currentSongUrl(): string {
    return song ? `https://suno.com/song/${song.songId}` : '';
}

/** Inline paste-a-link row revealed by the top-bar toggle (shared Load handler).
 *  Prefilled with the current song's URL so it reads as "override/edit". */
function pasteRowHtml(): string {
    return `
        <div class="paste-row">
            <input class="text-input" id="pasteInput" type="url" inputmode="url" value="${currentSongUrl()}"
                placeholder="${t('paste_placeholder')}" aria-label="${t('paste_title')}" />
            <button class="btn btn-primary" id="pasteLoadBtn" type="button">${t('paste_load')}</button>
        </div>
        <div class="inline-error" id="pasteError" hidden></div>
    `;
}

function footerHtml(connected: boolean): string {
    return `
        <div class="footer${connected ? '' : ' not-connected'}">
            <span class="status-dot"></span>
            <span>${connected ? t('connected_via') : t('not_connected')}</span>
        </div>
    `;
}

// --- Render / route ---------------------------------------------------------

function render(): void {
    const app = byId('app');
    const showFooter = state.view !== 'loading';
    const connected = state.view !== 'error';

    app.innerHTML = `
        ${topbarHtml()}
        <div id="view"></div>
        ${showFooter ? footerHtml(connected) : ''}
    `;

    bindPasteControls();

    const view = byId('view');
    switch (state.view) {
        case 'loading':
            renderLoading(view);
            break;
        case 'empty':
            renderEmpty(view, { actions, songTabs: bgSongTabs });
            break;
        case 'error':
            renderError(view, {
                actions,
                advancedOpen: state.advancedOpen,
                tokenOptions,
                selectedId: tokenSelectedId,
                error: loadError
            });
            break;
        case 'loaded':
            if (song) renderLoaded(view, { state, song, actions });
            break;
    }

    if (zipBuilding) {
        const btn = document.querySelector<HTMLButtonElement>('#zipDownload');
        if (btn) btn.disabled = true;
    }
}

/** Wires the top-bar paste toggle and the inline link Load control. */
function bindPasteControls(): void {
    const toggle = document.getElementById('pasteToggle');
    if (toggle) toggle.addEventListener('click', () => actions.togglePaste());

    const input = document.getElementById('pasteInput') as HTMLInputElement | null;
    const loadBtn = document.getElementById('pasteLoadBtn');
    if (input) {
        input.focus();
        // Prefilled with the current URL → select it so typing/pasting replaces
        // it in one step (override), while still allowing an edit.
        if (input.value) input.select();
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') actions.loadFromInput(input.value);
        });
        // Drag-and-drop a link onto the input.
        input.addEventListener('dragover', (e) => e.preventDefault());
        input.addEventListener('drop', (e) => {
            e.preventDefault();
            const text = e.dataTransfer?.getData('text') || '';
            if (text) {
                input.value = text;
                actions.loadFromInput(text);
            }
        });
    }
    if (loadBtn) loadBtn.addEventListener('click', () => actions.loadFromInput(input?.value || ''));
}

/** Shows an inline error in the element with `id` (if present in the current DOM). */
function showInlineError(id: string, message: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
}

// --- Load flow --------------------------------------------------------------

// Backstop so the popup can NEVER sit on "Fetching lyrics…" forever — if a load
// somehow outlasts every inner timeout, fail into the (actionable) error view.
const LOAD_TIMEOUT_MS = 25000;
let loadSeq = 0;

/** Loads a resolved song reference and routes the outcome into a view. */
function runLoad(ref: SongRef, tokenOptionId = 'auto'): void {
    currentRef = ref;
    const seq = ++loadSeq;
    state = setView(state, 'loading');
    render();

    const backstop = new Promise<LoadOutcome>((resolve) =>
        setTimeout(
            () =>
                resolve({
                    ok: false,
                    error: { kind: 'unknown', detail: 'timeout' },
                    tokenOptions,
                    tokenSelectedId: tokenOptionId
                }),
            LOAD_TIMEOUT_MS
        )
    );

    void Promise.race([loadSong(ref, tokenOptionId), backstop]).then((outcome) => {
        // Ignore a stale result if a newer load (e.g. Reconnect) already started.
        if (seq === loadSeq) applyOutcome(outcome);
    });
}

/** Parses pasted/dropped input into a song ref and loads it (US1 entry point). */
function loadFromInput(input: string): void {
    const songId = parseSongId(input);
    if (!songId) {
        // The input may live in the top bar or the empty state — set both.
        showInlineError('pasteError', t('err_bad_link'));
        showInlineError('emptyPasteError', t('err_bad_link'));
        return;
    }
    runLoad({ songId, source: 'paste', sourceUrl: input.trim() });
}

function applyOutcome(outcome: LoadOutcome): void {
    tokenOptions = outcome.tokenOptions;
    tokenSelectedId = outcome.tokenSelectedId;

    if (outcome.ok) {
        song = outcome.song;
        loadError = null;
        pasteOpen = false;
        state = setView(state, 'loaded');
        render();

        // Refine video availability in the background. Re-render ONLY when this
        // actually changes the UI — an unavailable video disables the Video tab.
        // When it's available (the common case) nothing visible changes, so we
        // skip the re-render to avoid a flicker: a full DOM replace would reflash
        // the cover image and remount the audio player with identical content.
        if (song.video) {
            void checkVideoAvailability(song.video).then((ok) => {
                if (!song || song.videoAvailable === ok) return;
                song.videoAvailable = ok;
                if (state.view === 'loaded' && !ok) render();
            });
        }
    } else {
        loadError = outcome.error;
        state = setView(state, 'error');
        render();
    }
}

/**
 * Fetches one asset's bytes directly from the popup. Extension pages carry the
 * extension's host_permissions, so cross-origin fetches to Suno hosts bypass
 * CORS — no background broker / base64 round-trip needed (that round-trip
 * silently dropped large payloads like the audio file). `credentials: 'include'`
 * sends the session cookie for auth-gated media. Returns null on failure (the
 * asset is skipped, never fatal — §8).
 */
async function fetchAssetBytes(url: string): Promise<Uint8Array | null> {
    try {
        // Public CDN assets — no credentials (avoids credentialed cross-origin
        // edge cases). host_permissions exempt these fetches from CORS.
        const res = await fetch(url);
        if (!res.ok) {
            logger.error(`Asset fetch HTTP ${res.status}: ${url}`);
            return null;
        }
        return new Uint8Array(await res.arrayBuffer());
    } catch (error) {
        logger.error(`Asset fetch failed for ${url}:`, error);
        return null;
    }
}

/** Confirms the visualizer video is actually playable; refines the Video tab. */
function checkVideoAvailability(videoUrl: string): Promise<boolean> {
    if (!videoUrl) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
        const video = document.createElement('video');
        video.style.display = 'none';
        const cleanup = (result: boolean): void => {
            clearTimeout(timeout);
            if (video.parentNode) document.body.removeChild(video);
            resolve(result);
        };
        const timeout = setTimeout(() => cleanup(false), 5000);
        video.onloadedmetadata = () => cleanup(true);
        video.onerror = () => cleanup(false);
        document.body.appendChild(video);
        video.src = videoUrl;
    });
}

// --- File helpers -----------------------------------------------------------

function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename, saveAs: false }, () => {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
}

function assetFilename(suffix: string): string {
    if (!song) return `song${suffix}`;
    return cleanFilename(`${song.artist} - ${song.title}`) + suffix;
}

// --- Actions ----------------------------------------------------------------

const actions: PopupActions = {
    openSuno() {
        chrome.tabs.create({ url: 'https://suno.com' });
    },

    setTab(tab: Tab) {
        state = setTab(state, tab);
        render();
    },

    toggleTimestamps() {
        state = toggleTimestamps(state);
        render();
    },

    toggleClean() {
        state = toggleClean(state);
        render();
    },

    setCaseMode(m: CaseMode) {
        state = setCaseMode(state, m);
        render();
    },

    copyLyrics() {
        if (!song) return;
        const text = renderedLyrics(song.lrcContent, state);
        navigator.clipboard
            .writeText(text)
            .then(() => flashButton('copyBtn', t('copy_lyrics')))
            .catch(() => logger.error('Clipboard write failed'));
    },

    downloadLrc() {
        if (!song) return;
        const text = lrcFileText(song.lrcContent, state.removePunct, state.caseMode, state.trim);
        triggerBlobDownload(new Blob([text], { type: 'text/plain' }), assetFilename('.lrc'));
    },

    toggleTrim() {
        state = toggleTrimOpen(state);
        render();
    },

    toggleTrimEnabled() {
        state = setTrim(state, { enabled: !state.trim.enabled });
        persistSettings();
        render();
    },

    setTrimText(field, value) {
        // Update + persist + live-refresh ONLY the lyrics box, so the input keeps
        // focus/caret (a full re-render would blur it mid-typing).
        state = setTrim(state, { [field]: value });
        persistSettings();
        const box = document.querySelector('.lyrics-box');
        if (box && song) box.innerHTML = lyricsLinesHtml(song, state);
    },

    toggleTrimCase() {
        state = setTrim(state, { caseSensitive: !state.trim.caseSensitive });
        persistSettings();
        render();
    },

    downloadAsset(kind: 'audio' | 'cover' | 'video') {
        if (!song) return;
        const map = {
            audio: { url: song.audio, suffix: '.mp3', errId: 'audioError' },
            cover: { url: song.image, suffix: ' (Cover).jpg', errId: 'coverError' },
            video: { url: song.video, suffix: ' (Video).mp4', errId: 'videoError' }
        }[kind];
        if (!map.url) {
            showInlineError(map.errId, t('asset_failed'));
            return;
        }
        chrome.downloads.download({ url: map.url, filename: assetFilename(map.suffix), saveAs: false }, () => {
            if (chrome.runtime.lastError) {
                logger.error('Asset download failed:', chrome.runtime.lastError);
                showInlineError(map.errId, t('asset_failed'));
            }
        });
    },

    toggleZipOpen() {
        state = toggleZipOpen(state);
        render();
    },

    toggleZipItem(k: keyof ZipSelection) {
        state = toggleZipItem(state, k);
        render();
    },

    downloadZip() {
        void buildAndDownloadZip();
    },

    reconnect() {
        void reload('auto');
    },

    toggleAdvanced() {
        state = toggleAdvanced(state);
        render();
    },

    retryWithSource(tokenOptionId: string) {
        void reload(tokenOptionId);
    },

    togglePaste() {
        pasteOpen = !pasteOpen;
        render();
    },

    loadFromInput(input: string) {
        loadFromInput(input);
    },

    loadRef(ref: SongRef) {
        runLoad(ref);
    }
};

// Persist settings on change, debounced so live typing doesn't hammer storage.
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function persistSettings(): void {
    clearTimeout(persistTimer);
    const snapshot: Settings = { lyricsTrim: state.trim };
    persistTimer = setTimeout(() => void saveSettings(snapshot), 250);
}

/** Re-runs the load for the current ref, or re-resolves one if none is set. */
async function reload(tokenOptionId: string): Promise<void> {
    const ref = currentRef ?? (await resolveInitialRef());
    if (ref) {
        runLoad(ref, tokenOptionId);
    } else {
        state = setView(state, 'empty');
        render();
    }
}

/** Briefly swaps a button's label to confirm an action, then restores it. */
function flashButton(id: string, original: string): void {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = '✓';
    setTimeout(() => {
        if (btn.isConnected) btn.innerHTML = `${icon('copy', 15)} ${original}`;
    }, 1200);
}

async function buildAndDownloadZip(): Promise<void> {
    if (!song || zipBuilding) return;
    zipBuilding = true;
    const dlBtn = document.querySelector<HTMLButtonElement>('#zipDownload');
    if (dlBtn) dlBtn.disabled = true;

    try {
        const manifest = buildManifest({
            selection: state.zip,
            title: song.title,
            // Same timed + trimmed .lrc as the download button produces.
            lrcContent: lrcFileText(song.lrcContent, state.removePunct, state.caseMode, state.trim),
            mediaUrls: { image: song.image, video: song.video, audio: song.audio }
        });

        const items: ZipItem[] = [];
        if (manifest.lyrics) {
            items.push({ name: manifest.lyrics.name, bytes: new TextEncoder().encode(manifest.lyrics.text) });
        }
        for (const f of manifest.fetch) {
            const bytes = await fetchAssetBytes(f.url);
            if (bytes) {
                items.push({ name: f.name, bytes });
            } else {
                logger.error(`ZIP: skipping ${f.key} (fetch failed)`);
            }
        }

        if (items.length === 0) {
            showInlineError('zipError', t('asset_failed'));
            return;
        }

        const blob = makeZipBlob(items);
        triggerBlobDownload(blob, `${cleanFilename(song.title) || 'song'}.zip`);
    } finally {
        zipBuilding = false;
        const btn = document.querySelector<HTMLButtonElement>('#zipDownload');
        if (btn) btn.disabled = false;
    }
}

// --- Bootstrap --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    render(); // initial loading skeleton
    void bootstrap();
});

async function bootstrap(): Promise<void> {
    // Apply persisted settings (lyrics trim) before the first content render.
    const settings = await loadSettings();
    state = setTrim(state, settings.lyricsTrim);

    // Resolve a song without depending on the active tab being a Suno page:
    // active Suno tab → a single background Suno song tab. When nothing is
    // unambiguous, fall to the empty state — which offers a paste-a-link input
    // and a chooser for any open Suno song tabs (never a dead end, FR-001).
    const ref = await resolveInitialRef();
    if (ref) {
        runLoad(ref);
        return;
    }
    bgSongTabs = await querySunoSongTabs();
    state = setView(state, 'empty');
    render();
}
