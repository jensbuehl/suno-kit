(() => {
    var n = {},
        e = {};

    function o(r) {
        var t = e[r];
        if (void 0 !== t) return t.exports;
        var s = e[r] = {
            exports: {}
        };
        return n[r](s, s.exports, o), s.exports
    }
    o.rv = () => "1.4.11", o.ruid = "bundler=rspack@1.4.11";
})();

// No need for caching or window opening anymore since popup is handled by manifest

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
