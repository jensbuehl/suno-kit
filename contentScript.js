(() => {
    var t = {},
        e = {};

    function n(o) {
        var r = e[o];
        if (void 0 !== r) return r.exports;
        var a = e[o] = {
            exports: {}
        };
        return t[o](a, a.exports, n), a.exports
    }

    function o(t, e, n, o, r, a, c) {
        try {
            var i = t[a](c),
                s = i.value
        } catch (t) {
            n(t);
            return
        }
        i.done ? e(s) : Promise.resolve(s).then(o, r)
    }

    function r(t) {
        return function() {
            var e = this,
                n = arguments;
            return new Promise(function(r, a) {
                var c = t.apply(e, n);

                function i(t) {
                    o(c, r, a, i, s, "next", t)
                }

                function s(t) {
                    o(c, r, a, i, s, "throw", t)
                }
                i(void 0)
            })
        }
    }

    function a(t, e) {
        var n, o, r, a = {
                label: 0,
                sent: function() {
                    if (1 & r[0]) throw r[1];
                    return r[1]
                },
                trys: [],
                ops: []
            },
            c = Object.create(("function" == typeof Iterator ? Iterator : Object).prototype);
        return c.next = i(0), c.throw = i(1), c.return = i(2), "function" == typeof Symbol && (c[Symbol.iterator] = function() {
            return this;
        }), c;

        function i(i) {
            return function(s) {
                var l = [i, s];
                if (n) throw TypeError("Generator is already executing.");
                for (; c && (c = 0, l[0] && (a = 0)), a;) try {
                    if (n = 1, o && (r = 2 & l[0] ? o.return : l[0] ? o.throw || ((r = o.return) && r.call(o), 0) : o.next) && !(r = r.call(o, l[1])).done) return r;
                    switch (o = 0, r && (l = [2 & l[0], r.value]), l[0]) {
                        case 0:
                        case 1:
                            r = l;
                            break;
                        case 4:
                            return a.label++, {
                                value: l[1],
                                done: !1
                            };
                        case 5:
                            a.label++, o = l[1], l = [0];
                            continue;
                        case 7:
                            l = a.ops.pop(), a.trys.pop();
                            continue;
                        default:
                            if (!(r = (r = a.trys).length > 0 && r[r.length - 1]) && (6 === l[0] || 2 === l[0])) {
                                a = 0;
                                continue
                            }
                            if (3 === l[0] && (!r || l[1] > r[0] && l[1] < r[3])) {
                                a.label = l[1];
                                break
                            }
                            if (6 === l[0] && a.label < r[1]) {
                                a.label = r[1], r = l;
                                break
                            }
                            if (r && a.label < r[2]) {
                                a.label = r[2], a.ops.push(l);
                                break
                            }
                            r[2] && a.ops.pop(), a.trys.pop();
                            continue
                    }
                    l = e.call(t, a)
                } catch (t) {
                    l = [6, t], o = 0
                } finally {
                    n = r = 0
                }
                if (5 & l[0]) throw l[1];
                return {
                    value: l[0] ? l[1] : void 0,
                    done: !0
                }
            }
        }
    }

    // Function to extract song metadata from the page
    function extractSongMetadata() {
        var metadata = {
            title: '',
            artist: '',
            mediaUrls: {
                image: '',
                video: ''
            }
        };

        // Method 1: Try to extract from the document title
        // Format: "Song Title by Artist Name | Suno"
        if (document.title) {
            var titleMatch = document.title.match(/^(.+?)\s+by\s+(.+?)\s*\|\s*Suno/);
            if (titleMatch && titleMatch.length >= 3) {
                metadata.title = titleMatch[1].trim();
                metadata.artist = titleMatch[2].trim();
            }
        }

        // Method 2: Try to extract from meta tags
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) {
            metadata.title = metadata.title || ogTitle.content.trim();
        }

        // Extract media URLs from various sources
        // Check for video element first (most reliable)
        var videoElement = document.querySelector('video[src*="cdn1.suno.ai/video_"]');
        if (videoElement && videoElement.src) {
            metadata.mediaUrls.video = videoElement.src;
            console.log('Found video URL from video element:', videoElement.src);
        }

        // Check for image in og:meta tags
        var ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.content) {
            metadata.mediaUrls.image = ogImage.content;
            console.log('Found image URL from og:image:', ogImage.content);
        }

        // Check for video in og:meta tags if not found in video element
        if (!metadata.mediaUrls.video) {
            var ogVideo = document.querySelector('meta[property="og:video"]');
            if (ogVideo && ogVideo.content) {
                metadata.mediaUrls.video = ogVideo.content;
                console.log('Found video URL from og:video:', ogVideo.content);
            }
        }

        // Method 3: Try to find artist from meta description
        // Format: "Song Title by Artist (@handle). Listen and make your own on Suno."
        var metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && metaDescription.content) {
            var descMatch = metaDescription.content.match(/by\s+(.+?)\s*KATEX_INLINE_OPEN@/);
            if (descMatch && descMatch[1]) {
                metadata.artist = metadata.artist || descMatch[1].trim();
            }
        }

        // Method 4: Try to find in script tags (for React/Next.js data)
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var scriptContent = scripts[i].textContent;
            if (scriptContent && scriptContent.includes('display_name')) {
                try {
                    // Try to parse as JSON
                    const data = JSON.parse(scriptContent);
                    if (data?.props?.pageProps) {
                        metadata.mediaUrls.image = metadata.mediaUrls.image || data.props.pageProps.imageUrl;
                        metadata.mediaUrls.video = metadata.mediaUrls.video || data.props.pageProps.videoUrl;
                    }
                } catch (e) {
                    // If JSON parse fails, try regex
                    var displayNameMatch = scriptContent.match(/"display_name"\s*:\s*"([^"]+)"/);
                    if (displayNameMatch && displayNameMatch[1] && !metadata.artist) {
                        metadata.artist = displayNameMatch[1];
                    }
                    var titleMatch2 = scriptContent.match(/"title"\s*:\s*"([^"]+)"/);
                    if (titleMatch2 && titleMatch2[1] && !metadata.title) {
                        metadata.title = titleMatch2[1].trim();
                    }
                    var imageMatch = scriptContent.match(/"imageUrl"\s*:\s*"([^"]+)"/);
                    if (imageMatch && imageMatch[1] && !metadata.mediaUrls.image) {
                        metadata.mediaUrls.image = imageMatch[1];
                    }
                    var videoMatch = scriptContent.match(/"videoUrl"\s*:\s*"([^"]+)"/);
                    if (videoMatch && videoMatch[1] && !metadata.mediaUrls.video) {
                        metadata.mediaUrls.video = videoMatch[1];
                    }
                }
            }
        }

        // Ensure we have both URLs by using fallbacks
        const songId = window.location.pathname.split('/')[2];
        if (!metadata.mediaUrls.image) {
            metadata.mediaUrls.image = `https://cdn1.suno.ai/${songId}/cover.jpg`;
        }
        if (!metadata.mediaUrls.video) {
            metadata.mediaUrls.video = `https://cdn1.suno.ai/${songId}/visualizer.mp4`;
        }

        // Debug logging for metadata extraction
        console.log('Extracted metadata details:', {
            title: metadata.title,
            artist: metadata.artist,
            mediaUrls: metadata.mediaUrls,
            foundInMetaTags: {
                image: !!document.querySelector('meta[property="og:image"]')?.content,
                video: !!document.querySelector('meta[property="og:video"]')?.content
            },
            songId: songId
        });

        return metadata;
    }
    // --- BEGIN: Fallback-Helpers fuer Bearer Token -------------------------

    // simple JWT-Erkennung: 3 durch Punkte getrennte Base64-Teile
    function isLikelyJwt(str) {
        if (!str || typeof str !== "string") return false;
        var token = str.trim();
        return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
    }

    function decodeJwtPayload(token) {
        try {
            var parts = token.split(".");
            if (parts.length !== 3) return null;
            var payloadPart = parts[1];

            // base64url -> base64
            var padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
            while (padded.length % 4) padded += "=";

            var json = atob(padded);
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    function getCookiesViaExtension(domains) {
        return new Promise(function(resolve) {
            try {
                chrome.runtime.sendMessage({
                    action: "FC_GET_SUNO_COOKIES",
                    domains: domains
                }, function(response) {
                    if (chrome.runtime.lastError || !response || !Array.isArray(response.cookies)) {
                        console.warn("Konnte Cookies nicht ueber chrome.cookies abrufen", chrome.runtime.lastError);
                        return resolve([]);
                    }
                    resolve(response.cookies);
                });
            } catch (err) {
                console.warn("Fehler beim Anfordern der Cookies via Background", err);
                resolve([]);
            }
        });
    }

    function formatPathResult(pathLabel, source, token) {
        var suffix = token ? token.slice(-10) : "";
        return "".concat(pathLabel, ": Der Cookie stammt aus ").concat(source || "unbekannt", token ? " und endet auf #".concat(suffix, "#") : "");
    }

    function makeCandidateId(candidate) {
        return "".concat(candidate.path || "Weg ?", "|").concat(candidate.source || "unknown");
    }

    function fetchAlignedWordsWithToken(songId, bearerToken) {
        return r(function() {
            var t, n, o;
            return a(this, function(r) {
                switch (r.label) {
                    case 0:
                        return r.trys.push([0, 3, , 4]), [4, fetch("".concat("https://studio-api.prod.suno.com/api/gen", "/").concat(songId, "/aligned_lyrics/v2/"), {
                            headers: {
                                Authorization: "Bearer ".concat(bearerToken),
                                "Content-Type": "application/json"
                            }
                        })];
                    case 1:
                        if (!(n = r.sent()).ok) throw Error("API request failed: ".concat(n.status));
                        return [4, n.json()];
                    case 2:
                        return [2, (null == (t = (o = r.sent()).aligned_words) ? void 0 : t.length) ? o.aligned_words : null];
                    case 3:
                        return console.warn("Token-Versuch fehlgeschlagen:", r.sent()), [2, null];
                    case 4:
                        return [2]
                }
            })
        })();
    }

    // Holt alle Kandidaten aus Cookies und localStorage, filtert dann auf Access-Token
    function getBearerTokenFromBrowser(preferredOptionId) {
        return r(function() {
            var candidates, debugText, cookieApiList, preferredId, options, indexById;
            return a(this, function(step) {
                switch (step.label) {
                    case 0:
                        candidates = [];
                        debugText = "NO_TOKEN";
                        preferredId = preferredOptionId && typeof preferredOptionId === "string" ? preferredOptionId : "auto";
                        return [4, getCookiesViaExtension(["auth.suno.com", ".suno.com", "suno.com"])];
                    case 1:
                        cookieApiList = step.sent();
                        try {
                            if (Array.isArray(cookieApiList)) {
                                for (var i = 0; i < cookieApiList.length; i++) {
                                    var c = cookieApiList[i];
                                    if (!c || !c.name) continue;
                                    var nameLower = c.name.toLowerCase();
                                    if (c.name === "__client" || c.name.indexOf("__client") === 0 || nameLower.indexOf("session") !== -1) {
                                        if (isLikelyJwt(c.value)) {
                                            candidates.push({
                                                token: c.value.trim(),
                                                source: "cookie-api:".concat(c.domain || "auth.suno.com", "/").concat(c.name),
                                                path: "Weg 1"
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Fehler beim Auslesen der chrome.cookies Daten fuer Bearer-Token", e);
                        }

                        // 2) document.cookie (fuer nicht-HttpOnly Cookies)
                        try {
                            var cookieString = document.cookie || "";
                            if (cookieString) {
                                var cookiePairs = cookieString.split("; ");
                                for (var j = 0; j < cookiePairs.length; j++) {
                                    var parts = cookiePairs[j].split("=");
                                    var name = parts.shift();
                                    var value = parts.join("=");
                                    if (name === "__session") {
                                        if (isLikelyJwt(value)) {
                                            candidates.push({
                                                token: value.trim(),
                                                source: "cookie:__session",
                                                path: "Weg 2"
                                            });
                                        }
                                    }
                                    if (name.indexOf("__client") === 0 || name.toLowerCase().indexOf("session") !== -1) {
                                        if (isLikelyJwt(value)) {
                                            candidates.push({
                                                token: value.trim(),
                                                source: "cookie:".concat(name),
                                                path: "Weg 2"
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Fehler beim Auslesen der Cookies fuer Bearer-Token", e);
                        }

                        // 3) localStorage nach Clerk-/Suno-bezogenen Daten durchsuchen
                        try {
                            for (var l = 0; l < localStorage.length; l++) {
                                var key = localStorage.key(l);
                                if (!key) continue;
                                if (
                                    key.indexOf("clerk") === -1 &&
                                    key.indexOf("suno") === -1 &&
                                    key.toLowerCase().indexOf("auth") === -1 &&
                                    key.toLowerCase().indexOf("session") === -1
                                ) {
                                    continue;
                                }

                                var raw = localStorage.getItem(key);
                                if (!raw) continue;

                                if (isLikelyJwt(raw)) {
                                    candidates.push({
                                        token: raw.trim(),
                                        source: "localStorage:".concat(key),
                                        path: "Weg 3"
                                    });
                                }

                                try {
                                    var obj = JSON.parse(raw);
                                    (function walk(o) {
                                        if (!o) return;
                                        if (typeof o === "string") {
                                            if (isLikelyJwt(o)) {
                                                candidates.push({
                                                    token: o.trim(),
                                                    source: "localStorage:".concat(key),
                                                    path: "Weg 3"
                                                });
                                            }
                                        } else if (typeof o === "object") {
                                            for (var prop in o) {
                                                if (!Object.prototype.hasOwnProperty.call(o, prop)) continue;
                                                walk(o[prop]);
                                            }
                                        }
                                    })(obj);
                                } catch (e) {}
                            }
                        } catch (e) {
                            console.warn("Fehler beim Auslesen von localStorage fuer Bearer-Token", e);
                        }

                        options = [];
                        indexById = {};
                        for (var optI = 0; optI < candidates.length; optI++) {
                            var id = makeCandidateId(candidates[optI]);
                            if (indexById[id]) continue;
                            indexById[id] = options.length + 1;
                            options.push({
                                id: id,
                                label: "Weg ".concat(indexById[id]),
                                index: indexById[id]
                            });
                        }

                        if (!candidates.length) {
                            console.warn("Kein JWT-Kandidat in Cookies/localStorage gefunden");
                            return [2, { candidates: [], debug: debugText, options: options, indexById: indexById }];
                        }

                        return [2, { candidates: candidates, debug: debugText, options: options, indexById: indexById }];
                }
            });
        })();
    }

    // --- END: Fallback-Helpers fuer Bearer Token -------------------------

    async function s(preferredOptionId) {
        var songId = window.location.pathname.split("/").pop() || "";
        var preferredId = preferredOptionId && typeof preferredOptionId === "string" ? preferredOptionId : "auto";

        if (!songId) {
            console.error("Could not extract song ID from URL");
            return { songId: null, lrcContent: null, tokenDebugPath: "NO_TOKEN", tokenOptions: [], tokenSelectedId: preferredId };
        }

        var metadata = extractSongMetadata();
        console.log("Extracted metadata:", metadata);

        var tokenInfo = await getBearerTokenFromBrowser(preferredId);
        var options = (tokenInfo && tokenInfo.options) || [];
        var indexById = (tokenInfo && tokenInfo.indexById) || {};
        var candidates = (tokenInfo && tokenInfo.candidates) || [];
        var tokenDebugPath = "Konnte kein Token finden";

        var candidatesToTry = [];
        if (candidates.length) {
            if (preferredId !== "auto") {
                var found = candidates.find(function(c) { return makeCandidateId(c) === preferredId; });
                candidatesToTry = found ? [found] : candidates.slice();
            } else {
                candidatesToTry = candidates.slice();
            }
        }
        if (candidatesToTry.length > 1) {
            var seen = {};
            candidatesToTry = candidatesToTry.filter(function(c) {
                var id = makeCandidateId(c);
                if (seen[id]) return false;
                seen[id] = true;
                return true;
            });
        }

        // Auto: erster Weg, der wirklich Lyrics liefert
        for (var i = 0; i < candidatesToTry.length; i++) {
            var candidate = candidatesToTry[i];
            var alignedWords = await fetchAlignedWordsWithToken(songId, candidate.token);
            if (!alignedWords || !alignedWords.length) continue;

            var chosenId = makeCandidateId(candidate);
            var chosenIdx = indexById[chosenId] || "?";
            tokenDebugPath = formatPathResult("Weg ".concat(chosenIdx), candidate.source, candidate.token);

            return {
                songId: songId,
                title: metadata.title,
                artist: metadata.artist,
                mediaUrls: metadata.mediaUrls,
                tokenDebugPath: tokenDebugPath,
                tokenOptions: options,
                tokenSelectedId: preferredId,
                lrcContent: alignedWords.map(function(t) {
                    var e, n, o, r;
                    var timestamp = (n = Math.floor((e = t.start_s) / 60), o = Math.floor(e % 60), r = Math.floor(e % 1 * 100), "[".concat(n.toString().padStart(2, "0"), ":").concat(o.toString().padStart(2, "0"), ".").concat(r.toString().padStart(2, "0"), "]"));
                    var word = t.word.replace(/```math\s*/g, '[').replace(/\s*```/g, ']').replace(/KATEX_INLINE_OPEN\s*/g, '(').replace(/\s*KATEX_INLINE_CLOSE/g, ')');
                    return timestamp.concat(word);
                }).join("\n")
            };
        }

        if (options.length) {
            tokenDebugPath = preferredId === "auto" ? "Auto: Kein Weg hat Lyrics geliefert" : "Auswahl: Kein Weg hat Lyrics geliefert";
        }

        return {
            songId: songId,
            title: metadata.title,
            artist: metadata.artist,
            mediaUrls: metadata.mediaUrls,
            tokenDebugPath: tokenDebugPath,
            tokenOptions: options,
            tokenSelectedId: preferredId,
            lrcContent: null
        };
    }

    n.rv = () => "1.4.11", n.ruid = "bundler=rspack@1.4.11";

    // Message listener for popup requests
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Content script received message:", request);

        if (request.action === "GET_LRC_DATA") {
            // Check if we're on a song page
            if (window.location.pathname.startsWith("/song/")) {
                s(request && request.tokenOptionId).then(function(result) {
                    console.log("Sending response to popup with data:", {
                        songId: result.songId,
                        hasTitle: !!result.title,
                        hasArtist: !!result.artist,
                        mediaUrls: result.mediaUrls,
                        hasLyrics: !!result.lrcContent
                    });
                    sendResponse(result);
                });
                return true; // Keep the message channel open for async response
            } else {
                    sendResponse({
                        songId: null,
                        lrcContent: null,
                        mediaUrls: null,
                        tokenDebugPath: "NO_TOKEN",
                        tokenOptions: [],
                        tokenSelectedId: "auto",
                        error: "Not on a song page"
                    });
                }
        }

        return false;
    });
})();

