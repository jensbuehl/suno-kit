// Querying open Suno tabs (tab-independent song sourcing + freshness). Uses the
// extension's existing host permissions for suno.com — no broad "tabs" permission.

import { parseSongId } from '../shared/songUrl';
import type { SongRef } from '../shared/types';

function queryTabs(urlPatterns: string[]): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
        try {
            chrome.tabs.query({ url: urlPatterns }, (tabs) => resolve(tabs || []));
        } catch {
            resolve([]);
        }
    });
}

/** All open Suno *song* tabs, mapped to a background SongRef (skips unparseable). */
export async function querySunoSongTabs(): Promise<SongRef[]> {
    const tabs = await queryTabs(['*://suno.com/song/*', '*://*.suno.com/song/*']);
    const refs: SongRef[] = [];
    for (const tab of tabs) {
        const songId = tab.url ? parseSongId(tab.url) : null;
        if (songId) refs.push({ songId, source: 'background-tab', sourceUrl: tab.url });
    }
    return refs;
}

/** True if any Suno tab is open (so a fresh token can be minted from it). */
export async function anySunoTabOpen(): Promise<boolean> {
    const tabs = await queryTabs(['*://suno.com/*', '*://*.suno.com/*']);
    return tabs.length > 0;
}

/** Id of an open Suno tab to mint a fresh token from (prefers a song page). */
export async function findSunoTabId(): Promise<number | null> {
    const songTabs = await queryTabs(['*://suno.com/song/*', '*://*.suno.com/song/*']);
    const anyTabs = songTabs.length ? songTabs : await queryTabs(['*://suno.com/*', '*://*.suno.com/*']);
    const withId = anyTabs.find((t) => typeof t.id === 'number');
    return withId?.id ?? null;
}
