import { logger } from '../shared/logger';
import type { GetCookiesRequest, GetCookiesResponse } from '../shared/types';

// Supplies the relevant Suno auth cookies (__client, __session, Clerk) to the
// content script, which cannot read HttpOnly cookies itself.
chrome.runtime.onMessage.addListener(
    (message: GetCookiesRequest, _sender, sendResponse: (response: GetCookiesResponse) => void) => {
        if (!message || message.action !== 'FC_GET_SUNO_COOKIES') return;

        const domains =
            Array.isArray(message.domains) && message.domains.length
                ? message.domains
                : ['suno.com', '.suno.com', 'auth.suno.com'];

        Promise.all(domains.map((domain) => chrome.cookies.getAll({ domain })))
            .then((results) => {
                const cookies = results.flat().filter(Boolean);
                sendResponse({ cookies });
            })
            .catch((error) => {
                logger.error('[Background] Fehler beim Lesen der Cookies:', error);
                sendResponse({ cookies: [], error: error?.message || String(error) });
            });

        return true; // async response
    }
);
