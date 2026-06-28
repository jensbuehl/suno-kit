// The loaded-song model held by the popup after a successful GET_LRC_DATA, plus
// the action callbacks the views invoke. Keeps views free of chrome.* (the
// router in popup.ts owns all messaging — see contracts/popup-modules.md).

import type { CaseMode, PopupState, Tab, ZipSelection } from './state';

export interface SongModel {
    songId: string;
    title: string;
    artist: string;
    lrcContent: string;
    image?: string;
    video?: string;
    audio?: string;
    duration?: string;
    model?: string;
    videoAvailable?: boolean;
}

/** Token-fallback data, only needed by the error view. */
export interface TokenInfo {
    options: { id: string; label: string; index: number }[];
    selectedId: string;
}

/** All side-effecting callbacks the views can trigger. Implemented in popup.ts. */
export interface PopupActions {
    // Top bar
    openSuno(): void;
    // Tabs / lyrics toolbar
    setTab(t: Tab): void;
    toggleTimestamps(): void;
    toggleClean(): void;
    setCaseMode(m: CaseMode): void;
    copyLyrics(): void;
    downloadLrc(): void;
    // Assets
    downloadAsset(kind: 'audio' | 'cover' | 'video'): void;
    // ZIP
    toggleZipOpen(): void;
    toggleZipItem(k: keyof ZipSelection): void;
    downloadZip(): void;
    // Error / token
    reconnect(): void;
    toggleAdvanced(): void;
    retryWithSource(tokenOptionId: string): void;
}

export interface LoadedProps {
    state: PopupState;
    song: SongModel;
    actions: PopupActions;
}

/** Formats seconds as m:ss (e.g. 151 → "2:31"). */
export function formatDuration(totalSeconds: number): string {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** Human-readable byte size (e.g. 5033165 → "4.8 MB"). */
export function formatBytes(bytes: number): string {
    if (!isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    const rounded = v >= 10 || i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
    return `${rounded} ${units[i]}`;
}
