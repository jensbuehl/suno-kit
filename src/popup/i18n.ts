export type Lang = 'de' | 'en';

export const LANGS: Lang[] = ['de', 'en'];

// Key-first message map: each string's translations live together, so adding a
// new string is a single entry rather than two edits kept in sync.
const messages: Record<string, Record<Lang, string>> = {
    title: { de: 'SUNO Copilot', en: 'SUNO Copilot' },
    subtitle: { de: 'More than Battlerap!', en: 'More than Battlerap!' },
    remove_punctuation: { de: 'Text bereinigen', en: 'Clean text' },
    to_upper: { de: 'ALLES GROSS', en: 'UPPERCASE' },
    to_lower: { de: 'alles klein', en: 'lowercase' },
    copy_clipboard: { de: 'Lyrics kopieren', en: 'Copy Lyrics' },
    download_file: { de: 'Lyrics herunterladen', en: 'Download Lyrics' },
    download_mp3: { de: 'Audio', en: 'Audio' },
    download_cover: { de: 'Cover', en: 'Cover' },
    download_video: { de: 'Video', en: 'Video' },
    error_loading: {
        de: 'Fehler beim Laden der Daten. Bitte die Seite neu laden.',
        en: 'Error loading data. Please reload the page.'
    },
    no_content: { de: 'Kein Inhalt verfügbar.', en: 'No content available.' },
    open_song_page: {
        de: 'Kein Song gefunden. Bitte öffne eine Hurensuno Song-Seite.',
        en: 'No Song found. Please open a Hurensuno song page.'
    },
    status_loaded: { de: 'Lyrics geladen', en: 'Lyrics loaded' },
    status_copied: { de: 'Lyrics in die Zwischenablage kopiert', en: 'Lyrics copied' },
    status_downloaded: { de: 'Datei heruntergeladen', en: 'File downloaded' },
    status_mp3_started: { de: 'Download gestartet', en: 'MP3 download started!' },
    status_error: { de: 'Unbekannter Fehler', en: 'Unknown Error' },
    status_nothing: {
        de: 'Es gibt nichts zu kopieren, Hurensohn!',
        en: 'Nothing to copy, motherfucker!'
    },
    placeholder: { de: 'Lade Lyrics, Hurensohn!', en: 'Processing Lyrics, bitch!' },
    token_path_label: { de: 'Token Erkennung', en: 'Token Discovery' },
    alternative_prefix: { de: 'Alternative', en: 'Alternative' },
    no_path_found: { de: 'Konnte keinen Weg finden', en: "couldn't find a path" },
    no_token_found: { de: 'Konnte kein Token finden', en: 'No token found' },
    auto_label: { de: 'Auto', en: 'Auto' },
    selection_label: { de: 'Auswahl', en: 'Selection' }
};

/** Returns the translation for `key` in `lang`, or '' if unknown. */
export function translate(key: string, lang: Lang): string {
    const entry = messages[key];
    return entry ? entry[lang] : '';
}
