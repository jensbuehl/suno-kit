import { CDN_BASE, LANG_STORAGE_KEY } from '../shared/config';
import { logger } from '../shared/logger';
import type {
    GetLrcDataRequest,
    LrcDataResponse,
    MediaUrls,
    TokenOption
} from '../shared/types';
import { type Lang, translate } from './i18n';
import {
    type TextOptions,
    addVizzyWorkaround,
    cleanFilename,
    convertLrc
} from './textProcessing';

interface MediaDownloadConfig {
    type: string;
    url?: string | null;
    suffix: string;
    successStatus?: string;
}

let originalLrcContent = '';
let songId = '';
let songTitle = '';
let artistName = '';
let currentLang: Lang = 'de';
let mediaUrls: MediaUrls | null = null;

/** Typed shortcut for document.getElementById (elements are known from popup.html). */
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
}

/** Translates a key in the current language. */
function t(key: string): string {
    return translate(key, currentLang);
}

/** Reads the current text-cleaning option toggles from the DOM. */
function readTextOptions(): TextOptions {
    return {
        removePunct: byId('removePunct').getAttribute('data-active') === 'true',
        toUpper: byId('toUpper').getAttribute('data-active') === 'true',
        toLower: byId('toLower').getAttribute('data-active') === 'true'
    };
}

/** Shows where the token came from (or a localized "no token" message). */
function updateTokenPath(text?: string | null): void {
    const el = byId('tokenPathDisplay');
    if (!el) return;
    const raw = text && typeof text === 'string' && text.trim() ? text.trim() : null;
    const fallback = t('no_token_found') || 'Konnte kein Token finden';

    if (raw === 'NO_TOKEN') {
        el.textContent = fallback;
        el.title = fallback;
        return;
    }

    let value = raw || fallback;
    if (raw) {
        value = raw.replace(/\bWeg\s*(\d+)\b/gi, (_m, num: string) => `${t('alternative_prefix') || 'Weg'} ${num}`);
        value = value.replace(/\bAuswahl\b/gi, t('selection_label') || 'Auswahl');
        value = value.replace(/\bAuto\b/gi, t('auto_label') || 'Auto');
    }

    el.textContent = value;
    el.title = value;
}

function updateTokenOptions(options: TokenOption[], selectedId?: string): void {
    const selectEl = byId<HTMLSelectElement>('tokenPathSelect');
    if (!selectEl) return;

    const safeOptions = Array.isArray(options) ? options : [];
    const keepValue = selectedId || selectEl.value || 'auto';

    selectEl.innerHTML = '';

    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = 'Auto';
    selectEl.appendChild(autoOpt);

    safeOptions.forEach((opt) => {
        if (!opt || !opt.id) return;
        const o = document.createElement('option');
        o.value = opt.id;

        const index = opt.index || (typeof opt.label === 'string' && (opt.label.match(/(\d+)\s*$/) || [])[1]);
        if (index) {
            o.textContent = `${t('alternative_prefix') || 'Weg'} ${index}`;
        } else if (opt.label) {
            const m = String(opt.label).match(/Weg\s*(\d+)/i);
            o.textContent = m && m[1] ? `${t('alternative_prefix') || 'Weg'} ${m[1]}` : opt.label;
        } else {
            o.textContent = opt.id;
        }

        selectEl.appendChild(o);
    });

    const found = Array.from(selectEl.options).some((o) => o.value === keepValue);
    selectEl.value = found ? keepValue : 'auto';
}

/** Updates all UI text to the given language (does not persist the choice). */
function applyLanguage(lang: Lang): void {
    currentLang = lang;

    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        const value = key ? translate(key, lang) : '';
        if (value) element.textContent = value;
    });

    document.querySelectorAll<HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-i18n-placeholder');
        const value = key ? translate(key, lang) : '';
        if (value) element.placeholder = value;
    });

    document.querySelectorAll<HTMLElement>('.lang-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

/** Applies a language and persists the choice to chrome.storage. */
function setLanguage(lang: Lang): void {
    applyLanguage(lang);
    chrome.storage.local.set({ [LANG_STORAGE_KEY]: lang });
}

/** Probes whether a video URL is actually playable. */
async function checkVideoAvailability(videoUrl: string): Promise<boolean> {
    if (!videoUrl || videoUrl.trim() === '') {
        return false;
    }

    try {
        // no-cors gives us no response details, so the result is intentionally ignored.
        await fetch(videoUrl, { method: 'HEAD', mode: 'no-cors' });

        // Confirm playability by loading metadata into a hidden <video>.
        return new Promise<boolean>((resolve) => {
            const video = document.createElement('video');
            video.style.display = 'none';

            const timeout = setTimeout(() => {
                document.body.removeChild(video);
                resolve(false);
            }, 5000);

            video.onloadedmetadata = () => {
                clearTimeout(timeout);
                document.body.removeChild(video);
                resolve(true);
            };

            video.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(video);
                resolve(false);
            };

            document.body.appendChild(video);
            video.src = videoUrl;
        });
    } catch {
        return false;
    }
}

/** Triggers a browser download for a song media file (MP3/cover/video). */
function downloadMedia(config: MediaDownloadConfig): void {
    if (!songId || !config.url) {
        logger.error(`Cannot download ${config.type}: missing songId or URL`);
        showStatus(t('status_error'), 'error');
        return;
    }
    const filename = cleanFilename(`${artistName} - ${songTitle}`) + config.suffix;

    chrome.downloads.download({ url: config.url, filename, saveAs: false }, () => {
        if (chrome.runtime.lastError) {
            logger.error('Download failed:', chrome.runtime.lastError);
            showStatus(t('status_error'), 'error');
        } else {
            showStatus(config.successStatus || t('status_downloaded'), 'success');
        }
    });
}

function downloadMp3(): void {
    downloadMedia({
        type: 'mp3',
        url: `${CDN_BASE}/${songId}.mp3`,
        suffix: '.mp3',
        successStatus: t('status_mp3_started')
    });
}

function downloadCover(): void {
    downloadMedia({ type: 'cover', url: mediaUrls?.image, suffix: ' (Cover).jpg' });
}

function downloadVideo(): void {
    downloadMedia({ type: 'video', url: mediaUrls?.video, suffix: ' (Video).mp4' });
}

/** Downloads the (optionally cleaned) LRC text as a file. */
function downloadResult(): void {
    let textToSave = byId<HTMLTextAreaElement>('output').value;
    if (!textToSave || textToSave === t('no_content') || textToSave === t('open_song_page')) {
        showStatus(t('status_nothing'), 'error');
        return;
    }
    textToSave = addVizzyWorkaround(textToSave);
    const filename = cleanFilename(`${artistName} - ${songTitle}`) + '.lrc';
    const blob = new Blob([textToSave], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.style.display = 'none';
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showStatus(t('status_downloaded'), 'success');
}

function copyToClipboard(): void {
    const outputArea = byId<HTMLTextAreaElement>('output');
    if (outputArea.value && outputArea.value !== t('no_content') && outputArea.value !== t('open_song_page')) {
        const textToCopy = addVizzyWorkaround(outputArea.value);
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => showStatus(t('status_copied'), 'success'))
            .catch(() => showStatus(t('status_error'), 'error'));
    } else {
        showStatus(t('status_nothing'), 'error');
    }
}

/** Title click: clean text, then download LRC, MP3, cover, and video in sequence. */
function downloadAllSequence(): void {
    if (!songId) {
        showStatus('No song data available', 'error');
        return;
    }

    const removePunctButton = byId('removePunct');
    if (removePunctButton && removePunctButton.getAttribute('data-active') !== 'true') {
        removePunctButton.setAttribute('data-active', 'true');
        if (originalLrcContent) {
            byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent, readTextOptions());
        }
    }

    setTimeout(() => {
        downloadResult();
        setTimeout(() => {
            downloadMp3();
            setTimeout(() => {
                if (mediaUrls?.image) downloadCover();
                setTimeout(() => {
                    if (mediaUrls?.video) downloadVideo();
                    showStatus('All downloads started successfully!', 'success');
                }, 500);
            }, 500);
        }, 500);
    }, 500);
}

/** Logs status to the console (the visual status bar was removed). */
function showStatus(message: string, type?: string): void {
    logger.debug(`[Suno Extension] ${(type || 'info').toUpperCase()}: ${message || ''}`);
}

type LrcRequestCallback = (response?: LrcDataResponse, lastError?: chrome.runtime.LastError) => void;

/**
 * Sends a message to the content script, injecting it on demand if it isn't
 * loaded yet (e.g. right after the extension was reloaded into an open tab).
 */
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
            chrome.tabs.sendMessage(tabId, message, (retryResponse?: LrcDataResponse) => {
                callback(retryResponse, chrome.runtime.lastError);
            });
        });
    });
}

/** Applies an LRC data response to the popup state and UI. */
function applyLrcResponse(response?: LrcDataResponse): void {
    updateTokenPath(response?.tokenDebugPath);
    const tokenOptions = response && Array.isArray(response.tokenOptions) ? response.tokenOptions : [];
    updateTokenOptions(tokenOptions, response?.tokenSelectedId);

    if (response && response.lrcContent) {
        originalLrcContent = response.lrcContent;
        songId = response.songId || '';
        songTitle = response.title || 'Unknown Title';
        artistName = response.artist || 'Unknown Artist';

        if (response.mediaUrls) {
            mediaUrls = response.mediaUrls;

            byId<HTMLButtonElement>('downloadMp3Button').disabled = false;
            byId<HTMLButtonElement>('downloadCoverButton').disabled = !mediaUrls.image;

            const videoUrlPresent = !!mediaUrls.video;
            const videoButton = byId<HTMLButtonElement>('downloadVideoButton');
            // Keep the video button disabled until we confirm the file is reachable.
            videoButton.disabled = true;

            if (videoUrlPresent) {
                videoButton.title = 'Checking video availability...';
                checkVideoAvailability(mediaUrls.video)
                    .then((isVideoAccessible) => {
                        videoButton.disabled = !isVideoAccessible;
                        if (!isVideoAccessible) {
                            videoButton.title = 'Video file not accessible or does not exist';
                            showStatus('Video file not accessible for this song', 'error');
                        } else {
                            videoButton.title = t('download_video');
                        }
                    })
                    .catch((error) => {
                        logger.error('[Video Check] Video accessibility check failed:', error);
                        videoButton.disabled = true;
                        videoButton.title = 'Video accessibility check failed';
                    });
            } else {
                videoButton.title = 'No video URL available';
            }

            if (!mediaUrls.image) {
                byId<HTMLButtonElement>('downloadCoverButton').title = t('status_error');
            }
        } else {
            byId<HTMLButtonElement>('downloadCoverButton').disabled = true;
            byId<HTMLButtonElement>('downloadVideoButton').disabled = true;
        }

        byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent, readTextOptions());
        showStatus(t('status_loaded'), 'success');
    } else if (response && response.error === 'Not on a song page') {
        byId<HTMLTextAreaElement>('output').value = t('open_song_page');
        showStatus(t('open_song_page'), 'info');
    } else {
        byId<HTMLTextAreaElement>('output').value = t('no_content');
        showStatus(t('no_content'), 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Render with the default language immediately, then apply the stored choice.
    applyLanguage('de');
    chrome.storage.local.get(LANG_STORAGE_KEY, (items) => {
        const saved = items[LANG_STORAGE_KEY] as Lang | undefined;
        if (saved && saved !== currentLang) applyLanguage(saved);
    });
    updateTokenPath('NO_TOKEN');
    updateTokenOptions([], 'auto');

    let isRefreshingFromDropdown = false;
    let lastTokenOptions: TokenOption[] = [];

    // Language switcher
    document.querySelectorAll<HTMLElement>('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang') as Lang;
            setLanguage(lang);
        });
    });

    // Token-path dropdown: switching reloads the lyrics via the chosen path.
    const tokenSelect = byId<HTMLSelectElement>('tokenPathSelect');
    if (tokenSelect) {
        tokenSelect.addEventListener('change', () => {
            if (isRefreshingFromDropdown) return;
            const tokenOptionId = tokenSelect.value || 'auto';

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0]?.id;
                if (tabId === undefined) return;
                isRefreshingFromDropdown = true;
                sendLrcRequest(tabId, { action: 'GET_LRC_DATA', tokenOptionId }, (response, lastError) => {
                    isRefreshingFromDropdown = false;
                    if (lastError) {
                        logger.error('Error:', lastError);
                        updateTokenPath('Konnte kein Token finden');
                        return;
                    }
                    if (response) {
                        lastTokenOptions = Array.isArray(response.tokenOptions)
                            ? response.tokenOptions
                            : lastTokenOptions;
                    }
                    applyLrcResponse(response);
                });
            });
        });
    }

    // Button event listeners
    byId('copyButton').addEventListener('click', copyToClipboard);
    byId('downloadButton').addEventListener('click', downloadResult);
    byId('closeButton').addEventListener('click', () => window.close());
    byId('downloadMp3Button').addEventListener('click', downloadMp3);
    byId('downloadCoverButton').addEventListener('click', downloadCover);
    byId('downloadVideoButton').addEventListener('click', downloadVideo);

    // Clickable title triggers the full download sequence.
    const titleElement = document.querySelector<HTMLElement>('h1[data-i18n="title"]');
    if (titleElement) {
        titleElement.addEventListener('click', () => downloadAllSequence());
        titleElement.style.cursor = 'pointer';
        titleElement.style.userSelect = 'none';
        titleElement.style.transition = 'all 0.3s ease';
        titleElement.title = 'Click to: Clean text + Download all files (LRC, MP3, Cover, Video)';
        titleElement.addEventListener('mouseenter', () => {
            titleElement.style.transform = 'scale(1.05)';
            titleElement.style.textShadow = '0 0 10px rgba(224, 60, 49, 0.5)';
        });
        titleElement.addEventListener('mouseleave', () => {
            titleElement.style.transform = 'scale(1)';
            titleElement.style.textShadow = 'none';
        });
    }

    // Text-cleaning option toggles
    ['removePunct', 'toUpper', 'toLower'].forEach((id) => {
        const button = byId(id);
        if (button) {
            button.addEventListener('click', () => {
                const currentState = button.getAttribute('data-active') === 'true';
                button.setAttribute('data-active', String(!currentState));
                if (originalLrcContent) {
                    byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent, readTextOptions());
                }
            });
        }
    });

    // Content script may notify us that a video URL is invalid.
    chrome.runtime.onMessage.addListener((message: { action?: string; songId?: string }) => {
        if (message && message.action === 'VIDEO_INVALID') {
            if (message.songId && message.songId === songId) {
                mediaUrls = mediaUrls || { image: '', video: '' };
                mediaUrls.video = '';
                const btn = byId<HTMLButtonElement>('downloadVideoButton');
                if (btn) {
                    btn.disabled = true;
                    btn.title = t('status_error');
                }
            }
            showStatus(t('status_error'), 'error');
        }
    });

    // Initial load: request LRC data for the active tab.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.includes('suno.com/song/') && tab.id !== undefined) {
            sendLrcRequest(tab.id, { action: 'GET_LRC_DATA' }, (response, lastError) => {
                if (lastError) {
                    logger.error('Error:', lastError);
                    let msg = t('error_loading');
                    if (lastError.message && lastError.message.indexOf('Receiving end does not exist') !== -1) {
                        msg += '\n\n(ContentScript nicht geladen: bitte Tab neu laden / Seite refreshen)';
                    }
                    byId<HTMLTextAreaElement>('output').value = msg;
                    updateTokenPath('Konnte kein Token finden');
                    updateTokenOptions([], 'auto');
                    showStatus(t('status_error'), 'error');
                    return;
                }
                if (response) {
                    lastTokenOptions = Array.isArray(response.tokenOptions)
                        ? response.tokenOptions
                        : lastTokenOptions;
                }
                applyLrcResponse(response);
            });
        } else {
            byId<HTMLTextAreaElement>('output').value = t('open_song_page');
            showStatus(t('open_song_page'), 'info');
            updateTokenPath('Konnte kein Token finden');
            updateTokenOptions([], 'auto');
        }
    });
});
