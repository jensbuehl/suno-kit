// Liefert relevante Cookies (__client, __session, Clerk) an das Content-Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.action !== "FC_GET_SUNO_COOKIES") return;

    const domains = Array.isArray(message.domains) && message.domains.length
        ? message.domains
        : ["suno.com", ".suno.com", "auth.suno.com"];

    const cookiePromises = domains.map((domain) => chrome.cookies.getAll({ domain }));

    Promise.all(cookiePromises)
        .then((results) => {
            const cookies = results.flat().filter(Boolean);
            sendResponse({ cookies });
        })
        .catch((error) => {
            console.error("[Background] Fehler beim Lesen der Cookies:", error);
            sendResponse({ cookies: [], error: error?.message || String(error) });
        });

    return true; // async response
});
