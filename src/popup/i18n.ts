// English-only string map. No DE/EN toggle, no LANG_STORAGE_KEY (spec §7). Kept
// as a map so future i18n is a localized addition, but the popup ships EN only.

const messages = {
    // Wordmark
    brand_sun: 'Suno',
    brand_co: 'Kit',

    // Footer / connection
    connected: 'Connected',
    connected_via: 'Connected via session token',
    not_connected: 'Not connected',

    // Lyrics toolbar + actions
    timestamps: 'Timestamps',
    clean: 'Clean',
    copy_lyrics: 'Copy lyrics',
    download_lrc: '.lrc',

    // Lyrics trim config
    trim_label: 'Trim',
    trim_toggle_hint: 'Activate / deactivate trimming (keeps your settings)',
    trim_edit_hint: 'Edit trim settings',
    trim_start: 'Start after a line containing',
    trim_end: 'End before a line containing',
    trim_placeholder: 'e.g. http or ©',
    trim_case: 'Match case',

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

    // Paste-a-link
    paste_title: 'Paste a Suno song link',
    paste_placeholder: 'https://suno.com/song/…',
    paste_load: 'Load',
    paste_toggle: 'Paste a song link',
    pick_song: 'Pick an open Suno song',

    // Source origin / override
    src_active: 'Active tab',
    src_background: 'Other tab',
    src_paste: 'Pasted link',
    change_source: 'Change source — paste a different link',

    // Loading
    loading_text: 'Fetching lyrics…',

    // Error state
    error_title: "Couldn't read your session",
    error_title_load: "Couldn't load this song",
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
    asset_failed: "Couldn't fetch this file",
    err_bad_link: "That's not a Suno song link.",
    err_not_signed_in: 'You’re not signed in to Suno. Open suno.com, sign in, then Reconnect.',
    err_session_expired:
        'Your Suno session expired. Open suno.com (it refreshes your session), then Reconnect.',
    err_song_inaccessible: "This song can't be accessed with your account.",
    err_offline: "Can't reach Suno. Check your connection, then Reconnect.",
    err_unknown: 'Could not load this song. Open suno.com, then Reconnect.'
} as const;

export type MessageKey = keyof typeof messages;

/** Returns the English string for `key` (empty string if unknown). */
export function t(key: MessageKey): string {
    return messages[key] ?? '';
}
