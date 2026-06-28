// English-only string map. No DE/EN toggle, no LANG_STORAGE_KEY (spec §7). Kept
// as a map so future i18n is a localized addition, but the popup ships EN only.

const messages = {
    // Wordmark
    brand_sun: 'SUNO',
    brand_co: 'Copilot',

    // Footer / connection
    connected: 'Connected',
    connected_via: 'Connected via session token',
    not_connected: 'Not connected',

    // Lyrics toolbar + actions
    timestamps: 'Timestamps',
    clean: 'Clean',
    copy_lyrics: 'Copy lyrics',
    download_lrc: '.lrc',

    // Asset downloads
    download_mp3: 'Download MP3',
    download_cover: 'Download cover',
    download_video: 'Download video',

    // Tabs
    tab_lyrics: 'Lyrics',
    tab_audio: 'Audio',
    tab_cover: 'Cover',
    tab_video: 'Video',

    // Empty state
    empty_title: 'No Suno song detected',
    empty_body: 'Open a song on suno.com to get started.',
    open_suno: 'Open suno.com',

    // Loading
    loading_text: 'Fetching lyrics…',

    // Error state
    error_title: "Couldn't read your session",
    error_body: "We couldn't find your Suno token. Make sure you're signed in at suno.com.",
    reconnect: 'Reconnect',
    try_other: 'Choose token source manually',
    retry_with: 'Retry with this source',
    manual_hint: 'Only change this if auto-detection picks the wrong token.',
    token_auto: 'Automatic (recommended)',

    // ZIP package
    download_all: 'Download all as ZIP',
    zip_label: 'ZIP',
    package_title: 'Download package',
    zip_nothing: 'Select at least 1 file',
    zip_download: 'Download ZIP',

    // Errors
    asset_failed: "Couldn't fetch this file"
} as const;

export type MessageKey = keyof typeof messages;

/** Returns the English string for `key` (empty string if unknown). */
export function t(key: MessageKey): string {
    return messages[key] ?? '';
}
