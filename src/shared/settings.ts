// Persisted user settings (chrome.storage.local). Single source of truth for the
// config schema + defaults — load once on popup open, save on change. Unlike the
// session token, settings are safe to persist.

export interface LyricsTrim {
    /** Master on/off — lets the user deactivate trimming without losing markers. */
    enabled: boolean;
    /** Drop every line up to & including the first line matching this. '' = off. */
    startAfter: string;
    /** Drop the first line matching this and everything after it. '' = off. */
    endBefore: string;
    matchMode: 'contains' | 'regex';
    caseSensitive: boolean;
}

export interface Settings {
    lyricsTrim: LyricsTrim;
}

export const DEFAULT_SETTINGS: Settings = {
    lyricsTrim: { enabled: true, startAfter: '', endBefore: '', matchMode: 'contains', caseSensitive: false }
};

const KEY = 'settings';

/** Fills any missing/invalid fields from defaults so callers get a complete object. */
function withDefaults(stored: unknown): Settings {
    const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<Settings>;
    const t = (s.lyricsTrim && typeof s.lyricsTrim === 'object' ? s.lyricsTrim : {}) as Partial<LyricsTrim>;
    return {
        lyricsTrim: {
            enabled: typeof t.enabled === 'boolean' ? t.enabled : true,
            startAfter: typeof t.startAfter === 'string' ? t.startAfter : '',
            endBefore: typeof t.endBefore === 'string' ? t.endBefore : '',
            matchMode: t.matchMode === 'regex' ? 'regex' : 'contains',
            caseSensitive: !!t.caseSensitive
        }
    };
}

export function loadSettings(): Promise<Settings> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(KEY, (res) => resolve(withDefaults(res?.[KEY])));
        } catch {
            resolve(DEFAULT_SETTINGS);
        }
    });
}

export function saveSettings(settings: Settings): Promise<void> {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.set({ [KEY]: settings }, () => resolve());
        } catch {
            resolve();
        }
    });
}
