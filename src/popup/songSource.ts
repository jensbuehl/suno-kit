// Resolves which song the popup should load, without depending on the active tab
// being a Suno page. Precedence (FR-008): explicit pasted link (handled in the
// popup) > active Suno song tab > a single open background Suno song tab.

import { parseSongId } from '../shared/songUrl';
import type { SongRef } from '../shared/types';
import { querySunoSongTabs } from './sunoTabs';

export { querySunoSongTabs };

function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve) => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
        } catch {
            resolve(undefined);
        }
    });
}

/** A SongRef for the active tab, when it is a Suno song page. */
export async function resolveActiveTabRef(): Promise<SongRef | null> {
    const tab = await getActiveTab();
    const songId = tab?.url ? parseSongId(tab.url) : null;
    return songId ? { songId, source: 'active-tab', sourceUrl: tab?.url } : null;
}

/**
 * Zero-input resolution: active Suno tab, else a single open Suno song tab.
 * Returns null when nothing unambiguous is available — the popup then shows the
 * paste/empty state, or a chooser when multiple background song tabs are open.
 */
export async function resolveInitialRef(): Promise<SongRef | null> {
    const active = await resolveActiveTabRef();
    if (active) return active;
    const background = await querySunoSongTabs();
    return background.length === 1 ? background[0] : null;
}
