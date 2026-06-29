// Popup bootstrap + view router. This is the ONLY module that talks to chrome.*
// (tabs / runtime / downloads); the views are pure DOM and call back through the
// PopupActions object implemented here. Re-render is a full-view replace (the
// popup is small) — see contracts/popup-modules.md.

import { CDN_BASE } from '../shared/config';
import { logger } from '../shared/logger';
import type { GetLrcDataRequest, LrcDataResponse, TokenOption } from '../shared/types';
import { t } from './i18n';
import { icon } from './icons';
import { lrcFileText, renderedLyrics } from './lyrics';
import type { PopupActions, SongModel } from './song';
import {
    type CaseMode,
    type PopupState,
    type Tab,
    type ZipSelection,
    initialState,
    setCaseMode,
    setTab,
    setView,
    toggleAdvanced,
    toggleClean,
    toggleTimestamps,
    toggleZipItem,
    toggleZipOpen
} from './state';
import { cleanFilename } from './textProcessing';
import { type ZipItem, buildManifest, makeZipBlob } from './zip';
import { renderEmpty } from './views/empty';
import { renderError } from './views/error';
import { renderLoaded } from './views/loaded';
import { renderLoading } from './views/loading';

// --- Module state -----------------------------------------------------------
let state: PopupState = initialState();
let song: SongModel | null = null;
let tokenOptions: TokenOption[] = [];
let tokenSelectedId = 'auto';
let activeTabId: number | undefined;
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
        </div>
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

    const view = byId('view');
    switch (state.view) {
        case 'loading':
            renderLoading(view);
            break;
        case 'empty':
            renderEmpty(view, { actions });
            break;
        case 'error':
            renderError(view, { actions, advancedOpen: state.advancedOpen, tokenOptions, selectedId: tokenSelectedId });
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

/** Shows an inline error in the element with `id` (if present in the current DOM). */
function showInlineError(id: string, message: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
}

// --- Messaging --------------------------------------------------------------

type LrcRequestCallback = (response?: LrcDataResponse, lastError?: chrome.runtime.LastError) => void;

/** Sends GET_LRC_DATA, injecting the content script on demand if not present. */
function sendLrcRequest(tabId: number, message: GetLrcDataRequest, callback: LrcRequestCallback): void {
    chrome.tabs.sendMessage(tabId, message, (response?: LrcDataResponse) => {
        const err = chrome.runtime.lastError;
        const notInjected =
            !!err && /Receiving end does not exist|Could not establish connection/i.test(err.message || '');
        if (!notInjected) {
            callback(response, err);
            return;
        }
        chrome.scripting.executeScript({ target: { tabId }, files: ['contentScript.js'] }, () => {
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }
            chrome.tabs.sendMessage(tabId, message, (retry?: LrcDataResponse) => {
                callback(retry, chrome.runtime.lastError);
            });
        });
    });
}

/** Issues a request against the active tab and routes the response into a view. */
function requestLrc(message: GetLrcDataRequest): void {
    state = setView(state, 'loading');
    render();
    if (activeTabId === undefined) {
        applyResponse(undefined, { message: 'No active tab' } as chrome.runtime.LastError);
        return;
    }
    sendLrcRequest(activeTabId, message, (response, lastError) => applyResponse(response, lastError));
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

function applyResponse(response?: LrcDataResponse, lastError?: chrome.runtime.LastError): void {
    if (!response || lastError) {
        // Content script not reachable (e.g. non-Suno tab) ⇒ no song detected.
        state = setView(state, 'empty');
        render();
        return;
    }
    if (response.error === 'Not on a song page') {
        state = setView(state, 'empty');
        render();
        return;
    }

    tokenOptions = Array.isArray(response.tokenOptions) ? response.tokenOptions : [];
    tokenSelectedId = response.tokenSelectedId || 'auto';

    if (response.lrcContent) {
        const songId = response.songId || '';
        // Audio fallback computed here too (not only in the content script) so a
        // stale/old content script in an un-refreshed tab can't leave audio
        // "undetected" — the popup always loads fresh and knows the song id.
        const audio = response.mediaUrls?.audio || (songId ? `${CDN_BASE}/${songId}.mp3` : undefined);
        song = {
            songId,
            title: response.title || 'Unknown Title',
            artist: response.artist || 'Unknown Artist',
            lrcContent: response.lrcContent,
            image: response.mediaUrls?.image || undefined,
            video: response.mediaUrls?.video || undefined,
            audio,
            duration: response.duration,
            model: response.model
        };
        state = setView(state, 'loaded');
        render();

        // Refine video availability in the background, then re-render if it changed.
        if (song.video) {
            void checkVideoAvailability(song.video).then((ok) => {
                if (song) {
                    song.videoAvailable = ok;
                    if (state.view === 'loaded') render();
                }
            });
        }
    } else {
        // lrcContent == null ⇒ token failure; surface the error view (§6).
        state = setView(state, 'error');
        render();
    }
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
        const text = lrcFileText(song.lrcContent, state.removePunct, state.caseMode);
        triggerBlobDownload(new Blob([text], { type: 'text/plain' }), assetFilename('.lrc'));
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
        requestLrc({ action: 'GET_LRC_DATA', tokenOptionId: 'auto' });
    },

    toggleAdvanced() {
        state = toggleAdvanced(state);
        render();
    },

    retryWithSource(tokenOptionId: string) {
        requestLrc({ action: 'GET_LRC_DATA', tokenOptionId });
    }
};

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
            lrcContent: song.lrcContent,
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

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        activeTabId = tab?.id;
        if (tab && tab.url && tab.url.includes('suno.com') && tab.id !== undefined) {
            requestLrc({ action: 'GET_LRC_DATA' });
        } else {
            state = setView(state, 'empty');
            render();
        }
    });

    // Content script may report a video URL turned out unplayable.
    chrome.runtime.onMessage.addListener((message: { action?: string; songId?: string }) => {
        if (message?.action === 'VIDEO_INVALID' && song && message.songId === song.songId) {
            song.videoAvailable = false;
            if (state.view === 'loaded') render();
        }
    });
});
