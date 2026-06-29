// Single in-memory UI-state model for the popup + pure transition helpers.
// No DOM, no chrome.* — the view router re-renders when state changes (spec §7).

import { DEFAULT_SETTINGS, type LyricsTrim } from '../shared/settings';

export type View = 'loaded' | 'empty' | 'loading' | 'error';
export type Tab = 'lyrics' | 'audio' | 'cover' | 'video';
export type CaseMode = 'none' | 'upper' | 'lower';

export interface ZipSelection {
    lyrics: boolean;
    audio: boolean;
    cover: boolean;
    video: boolean;
}

export interface PopupState {
    view: View;
    tab: Tab;
    timestamps: boolean;
    removePunct: boolean;
    caseMode: CaseMode;
    zipOpen: boolean;
    zip: ZipSelection;
    advancedOpen: boolean;
    trimOpen: boolean;
    trim: LyricsTrim;
}

/** Fresh state for a newly opened popup (starts in loading; default lyrics tab). */
export function initialState(): PopupState {
    return {
        view: 'loading',
        tab: 'lyrics',
        timestamps: true,
        removePunct: true, // matches the current popup's default "Clean" on
        caseMode: 'none',
        zipOpen: false,
        zip: { lyrics: true, audio: true, cover: true, video: true },
        advancedOpen: false,
        trimOpen: false,
        trim: { ...DEFAULT_SETTINGS.lyricsTrim }
    };
}

export function setView(s: PopupState, v: View): PopupState {
    return { ...s, view: v };
}

export function setTab(s: PopupState, t: Tab): PopupState {
    return { ...s, tab: t };
}

export function toggleTimestamps(s: PopupState): PopupState {
    return { ...s, timestamps: !s.timestamps };
}

export function toggleClean(s: PopupState): PopupState {
    return { ...s, removePunct: !s.removePunct };
}

/** Case modes are mutually exclusive; selecting the active one clears to 'none'. */
export function setCaseMode(s: PopupState, m: CaseMode): PopupState {
    return { ...s, caseMode: s.caseMode === m ? 'none' : m };
}

export function toggleZipOpen(s: PopupState): PopupState {
    return { ...s, zipOpen: !s.zipOpen };
}

export function toggleZipItem(s: PopupState, k: keyof ZipSelection): PopupState {
    return { ...s, zip: { ...s.zip, [k]: !s.zip[k] } };
}

export function toggleAdvanced(s: PopupState): PopupState {
    return { ...s, advancedOpen: !s.advancedOpen };
}

export function toggleTrimOpen(s: PopupState): PopupState {
    return { ...s, trimOpen: !s.trimOpen };
}

export function setTrim(s: PopupState, partial: Partial<LyricsTrim>): PopupState {
    return { ...s, trim: { ...s.trim, ...partial } };
}

/** Number of currently selected ZIP items (button enable/label depends on it). */
export function zipCount(s: PopupState): number {
    return Object.values(s.zip).filter(Boolean).length;
}
