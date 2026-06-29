// On-demand session-token refresh (US3 freshness). When the cookie-jar token is
// stale, mint a fresh one by asking Clerk inside a live Suno page — injected into
// the MAIN world so it can reach the page's `window.Clerk`. Requires an open Suno
// tab; returns null when none is available or Clerk can't issue a token.

import { logger } from '../shared/logger';
import { findSunoTabId } from './sunoTabs';

export async function mintFreshToken(): Promise<string | null> {
    const tabId = await findSunoTabId();
    if (tabId == null) return null;
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: async () => {
                const clerk = (window as unknown as { Clerk?: { session?: { getToken?: () => Promise<string> } } })
                    .Clerk;
                if (!clerk?.session?.getToken) return null;
                try {
                    return await clerk.session.getToken();
                } catch {
                    return null;
                }
            }
        });
        const token = results?.[0]?.result;
        return typeof token === 'string' && token ? token : null;
    } catch (e) {
        logger.warn('Token mint via Suno tab failed', e);
        return null;
    }
}
