import type {
    GetLrcDataRequest,
    LrcDataResponse,
    MediaUrls,
    TokenOption
} from '../shared/types';

type Lang = 'de' | 'en';

interface TextOptions {
    removePunct: boolean;
    toUpper: boolean;
    toLower: boolean;
}

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

// Language strings
const i18n: Record<Lang, Record<string, string>> = {
    de: {
        title: 'SUNO Copilot',
        subtitle: 'More than Battlerap!',
        remove_punctuation: 'Text bereinigen',
        to_upper: 'ALLES GROSS',
        to_lower: 'alles klein',
        copy_clipboard: 'Lyrics kopieren',
        download_file: 'Lyrics herunterladen',
        download_mp3: 'Audio',
        download_cover: 'Cover',
        download_video: 'Video',
        error_loading: 'Fehler beim Laden der Daten. Bitte die Seite neu laden.',
        no_content: 'Kein Inhalt verfügbar.',
        open_song_page: 'Kein Song gefunden. Bitte öffne eine Hurensuno Song-Seite.',
        status_loaded: 'Lyrics geladen',
        status_copied: 'Lyrics in die Zwischenablage kopiert',
        status_downloaded: 'Datei heruntergeladen',
        status_mp3_started: 'Download gestartet',
        status_error: 'Unbekannter Fehler',
        status_nothing: 'Es gibt nichts zu kopieren, Hurensohn!',
        placeholder: 'Lade Lyrics, Hurensohn!',
        token_path_label: 'Token Erkennung',
        alternative_prefix: 'Alternative',
        no_path_found: 'Konnte keinen Weg finden',
        no_token_found: 'Konnte kein Token finden',
        auto_label: 'Auto',
        selection_label: 'Auswahl'
    },
    en: {
        title: 'SUNO Copilot',
        subtitle: 'More than Battlerap!',
        remove_punctuation: 'Clean text',
        to_upper: 'UPPERCASE',
        to_lower: 'lowercase',
        copy_clipboard: 'Copy Lyrics',
        download_file: 'Download Lyrics',
        download_mp3: 'Audio',
        download_cover: 'Cover',
        download_video: 'Video',
        error_loading: 'Error loading data. Please reload the page.',
        no_content: 'No content available.',
        open_song_page: 'No Song found. Please open a Hurensuno song page.',
        status_loaded: 'Lyrics loaded',
        status_copied: 'Lyrics copied',
        status_downloaded: 'File downloaded',
        status_mp3_started: 'MP3 download started!',
        status_error: 'Unknown Error',
        status_nothing: 'Nothing to copy, motherfucker!',
        placeholder: 'Processing Lyrics, bitch!',
        token_path_label: 'Token Discovery',
        alternative_prefix: 'Alternative',
        no_path_found: "couldn't find a path",
        no_token_found: 'No token found',
        auto_label: 'Auto',
        selection_label: 'Selection'
    }
};

function t(key: string): string {
    return i18n[currentLang][key] ?? '';
}

// Punctuation characters stripped during text cleaning.
const PUNCTUATION_TO_REMOVE = [
    '-', ',', '?', '*', '"', '–', '!', '„', '“',
    '.', ':', '”', '‘',
    ';', '¿', '¡', '…', '—', '(', ')', '{', '}', '/', '\\',
    '«', '»', '‹', '›', '〈', '〉', '《', '》', '〔', '〕',
    '~'
];

/** Shows where the token came from (or a localized "no token" message). */
function updateTokenPath(text?: string | null): void {
    const el = byId('tokenPathDisplay');
    if (!el) return;
    const raw = text && typeof text === 'string' && text.trim() ? text.trim() : null;
    const fallback = t('no_token_found') || 'Konnte kein Token finden';

    if (raw === 'NO_TOKEN') {
        const translated = t('no_token_found') || 'Konnte kein Token finden';
        el.textContent = translated;
        el.title = translated;
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

/** Translates the interface to the given language and persists the choice. */
function translateInterface(lang: Lang): void {
    currentLang = lang;
    localStorage.setItem('suno-lyrics-lang', lang);

    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (key && i18n[lang][key]) {
            element.textContent = i18n[lang][key];
        }
    });

    document.querySelectorAll<HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (key && i18n[lang][key]) {
            element.placeholder = i18n[lang][key];
        }
    });

    document.querySelectorAll<HTMLElement>('.lang-btn').forEach((btn) => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
}

function removePunctuation(text: string): string {
    let result = text;
    for (const char of PUNCTUATION_TO_REMOVE) {
        while (result.indexOf(char) !== -1) {
            result = result.replace(char, '');
        }
    }

    // Remove emojis across the common Unicode ranges.
    result = result.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    result = result.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
    result = result.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
    result = result.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    result = result.replace(/[\u{2600}-\u{26FF}]/gu, '');
    result = result.replace(/[\u{2700}-\u{27BF}]/gu, '');
    result = result.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    result = result.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');

    return result.replace(/\s+/g, ' ').trim();
}

function cleanFilename(filename: string): string {
    return filename
        .replace(/[<>:"/|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Removes square brackets and their contents (always applied first). */
function removeBrackets(text: string): string {
    return text.replace(/\[[^\]]*\]/g, '');
}

function cleanLyricsText(text: string): string {
    return text
        .replace(/([(])\s+/g, '$1') // remove space directly after an opening bracket
        .replace(/„ +/g, '„') // remove spaces after German opening quotes
        .replace(/“ +/g, '“') // remove spaces after double quotes
        .replace(/‘ +/g, '‘') // remove spaces after single quotes
        .replace(/\s+/g, ' ')
        .trim();
}

/** Applies the active cleaning options to a piece of lyric text. */
function applyTextOptions(text: string, opts: TextOptions): string {
    text = removeBrackets(text);
    if (opts.removePunct) text = removePunctuation(text);
    if (opts.toUpper) text = text.toUpperCase();
    if (opts.toLower) text = text.toLowerCase();
    return text;
}

/** Reformats raw LRC into one line per verse, applying the chosen options. */
function convertLrc(lrcContent: string): string {
    const lines = lrcContent.split('\n');
    let result = '';
    let currentVerse: string[] = [];
    let firstTimestamp = '';
    const opts: TextOptions = {
        removePunct: byId('removePunct').getAttribute('data-active') === 'true',
        toUpper: byId('toUpper').getAttribute('data-active') === 'true',
        toLower: byId('toLower').getAttribute('data-active') === 'true'
    };

    function flushVerse(): void {
        if (currentVerse.length === 0) return;
        const verseText = cleanLyricsText(applyTextOptions(currentVerse.join(' ').trim(), opts));
        result += `[${firstTimestamp}]${verseText}\n`;
        currentVerse = [];
        firstTimestamp = '';
    }

    for (const line of lines) {
        if (line.trim() === '') {
            flushVerse();
            continue;
        }

        const timeMatches: string[] = [];
        let textPart = line;
        let pos = 0;

        while (pos < textPart.length) {
            const openBracketPos = textPart.indexOf('[', pos);
            if (openBracketPos === -1) break;

            const closeBracketPos = textPart.indexOf(']', openBracketPos);
            if (closeBracketPos === -1) break;

            const content = textPart.substring(openBracketPos + 1, closeBracketPos);
            if (/^\d{2}:\d{2}\.\d{2,3}$/.test(content)) {
                timeMatches.push(content);
            }
            textPart = textPart.substring(0, openBracketPos) + textPart.substring(closeBracketPos + 1);
            pos = openBracketPos;
        }

        textPart = textPart.trim();

        if (timeMatches.length > 0 && firstTimestamp === '') {
            firstTimestamp = timeMatches[0];
        }

        if (textPart) {
            textPart = applyTextOptions(textPart, opts);
            if (textPart) currentVerse.push(textPart);
        }
    }

    flushVerse();

    return result.trim();
}

/** Duplicates the last LRC line +2 seconds (workaround for the Vizzy player). */
function addVizzyWorkaround(lrcContent: string): string {
    if (!lrcContent || !lrcContent.trim()) return lrcContent;

    const lines = lrcContent.trim().split('\n');
    if (lines.length === 0) return lrcContent;

    const lastLine = lines[lines.length - 1];
    const timestampMatch = lastLine.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (!timestampMatch) return lrcContent;

    let minutes = parseInt(timestampMatch[1], 10);
    let seconds = parseInt(timestampMatch[2], 10);
    const milliseconds = parseInt(timestampMatch[3], 10);

    seconds += 2;
    if (seconds >= 60) {
        minutes += Math.floor(seconds / 60);
        seconds = seconds % 60;
    }

    const newTimestamp =
        `${String(minutes).padStart(2, '0')}:` +
        `${String(seconds).padStart(2, '0')}.` +
        `${String(milliseconds).padStart(2, '0')}`;

    const duplicatedLine = lastLine.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, `[${newTimestamp}]`);
    return `${lrcContent}\n${duplicatedLine}`;
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
        console.error(`Cannot download ${config.type}: missing songId or URL`);
        showStatus(t('status_error'), 'error');
        return;
    }
    const filename = cleanFilename(`${artistName} - ${songTitle}`) + config.suffix;

    chrome.downloads.download({ url: config.url, filename, saveAs: false }, () => {
        if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            showStatus(t('status_error'), 'error');
        } else {
            showStatus(config.successStatus || t('status_downloaded'), 'success');
        }
    });
}

function downloadMp3(): void {
    downloadMedia({
        type: 'mp3',
        url: `https://cdn1.suno.ai/${songId}.mp3`,
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
            byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent);
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
    console.debug(`[Suno Extension] ${(type || 'info').toUpperCase()}: ${message || ''}`);
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
                        console.error('[Video Check] Video accessibility check failed:', error);
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

        byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent);
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
    const savedLang = (localStorage.getItem('suno-lyrics-lang') as Lang) || 'de';
    translateInterface(savedLang);
    updateTokenPath('NO_TOKEN');
    updateTokenOptions([], 'auto');

    let isRefreshingFromDropdown = false;
    let lastTokenOptions: TokenOption[] = [];

    // Language switcher
    document.querySelectorAll<HTMLElement>('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang') as Lang;
            translateInterface(lang);
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
                        console.error('Error:', lastError);
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
                    byId<HTMLTextAreaElement>('output').value = convertLrc(originalLrcContent);
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
                    console.error('Error:', lastError);
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
