// On-demand session-token refresh (US3 freshness). When the cookie-jar token is
// stale, mint a fresh one by asking Clerk inside a live Suno page — injected into
// the MAIN world so it can reach the page's `window.Clerk`. Requires an open Suno
// tab; returns null when none is available or Clerk can't issue a token.

import { logger } from '../shared/logger';
import { findSunoTabId } from './sunoTabs';

// Time caps so a hung Clerk call (expired session after long inactivity) can't
// stall the load: the injected getToken self-aborts, and the whole injection is
// also raced against a timeout in case executeScript itself never settles.
const PAGE_TOKEN_TIMEOUT_MS = 6000;
const INJECT_TIMEOUT_MS = 9000;

export async function mintFreshToken(): Promise<string | null> {
    const tabId = await findSunoTabId();
    if (tabId == null) return null;
    try {
        const exec = chrome.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            args: [PAGE_TOKEN_TIMEOUT_MS],
            func: async (timeoutMs: number) => {
                const clerk = (window as unknown as { Clerk?: { session?: { getToken?: () => Promise<string> } } })
                    .Clerk;
                if (!clerk?.session?.getToken) return null;
                try {
                    return await Promise.race([
                        clerk.session.getToken(),
                        new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))
                    ]);
                } catch {
                    return null;
                }
            }
        });
        const results = await Promise.race([
            exec,
            new Promise<null>((r) => setTimeout(() => r(null), INJECT_TIMEOUT_MS))
        ]);
        const token = Array.isArray(results) ? results[0]?.result : null;
        return typeof token === 'string' && token ? token : null;
    } catch (e) {
        logger.warn('Token mint via Suno tab failed', e);
        return null;
    }
}
