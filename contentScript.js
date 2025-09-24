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
            return this
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
            artist: ''
        };

        // Method 1: Try to extract from the document title
        // Format: "Song Title by Artist Name | Suno"
        if (document.title) {
            var titleMatch = document.title.match(/^(.+?)\s+by\s+(.+?)\s*\|\s*Suno/);
            if (titleMatch && titleMatch.length >= 3) {
                metadata.title = titleMatch[1].trim();
                metadata.artist = titleMatch[2].trim();
                return metadata;
            }
        }

        // Method 2: Try to extract from meta tags
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) {
            metadata.title = ogTitle.content.trim();
        }

        // Method 3: Try to find artist from meta description
        // Format: "Song Title by Artist (@handle). Listen and make your own on Suno."
        var metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && metaDescription.content) {
            var descMatch = metaDescription.content.match(/by\s+(.+?)\s*KATEX_INLINE_OPEN@/);
            if (descMatch && descMatch[1]) {
                metadata.artist = descMatch[1].trim();
            }
        }

        // Method 4: Fallback - try to find in script tags (for React/Next.js data)
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var scriptContent = scripts[i].textContent;
            if (scriptContent && scriptContent.includes('display_name')) {
                // Try to extract display_name
                var displayNameMatch = scriptContent.match(/"display_name"\s*:\s*"([^"]+)"/);
                if (displayNameMatch && displayNameMatch[1] && !metadata.artist) {
                    metadata.artist = displayNameMatch[1];
                }
                // Try to extract title
                var titleMatch = scriptContent.match(/"title"\s*:\s*"([^"]+)"/);
                if (titleMatch && titleMatch[1] && !metadata.title) {
                    metadata.title = titleMatch[1].trim();
                }
            }
        }

        return metadata;
    }

    function s() {
        return r(function() {
            var t, e, n, i;
            return a(this, function(o) {
                switch (o.label) {
                    case 0:
                        var s, l, u;
                        if (!(t = window.location.pathname.split("/").pop() || "")) return console.error("Could not extract song ID from URL"), [2, {songId: null, lrcContent: null}];
                        
                        // Extract metadata
                        i = extractSongMetadata();
                        console.log("Extracted metadata:", i);
                        
                        if (!(e = 2 === (l = "; ".concat(document.cookie).split("; ".concat("__session", "="))).length ? null == (s = l.pop()) ? void 0 : s.split(";").shift() : void 0)) return console.error("Session token not found in cookies"), [2, {songId: null, lrcContent: null}];
                        return [4, (u = t, r(function() {
                            var t, n, o;
                            return a(this, function(r) {
                                switch (r.label) {
                                    case 0:
                                        return r.trys.push([0, 3, , 4]), [4, fetch("".concat("https://studio-api.prod.suno.com/api/gen", "/").concat(u, "/aligned_lyrics/v2/"), {
                                            headers: {
                                                Authorization: "Bearer ".concat(e),
                                                "Content-Type": "application/json"
                                            }
                                        })];
                                    case 1:
                                        if (!(n = r.sent()).ok) throw Error("API request failed: ".concat(n.status));
                                        return [4, n.json()];
                                    case 2:
                                        return [2, (null == (t = (o = r.sent()).aligned_words) ? void 0 : t.length) ? o.aligned_words : null];
                                    case 3:
                                        return console.error("Error fetching aligned words:", r.sent()), [2, null];
                                    case 4:
                                        return [2]
                                }
                            })
                        })())];
                    case 1:
                        return (n = o.sent()) ? [2, {
                            songId: t,
                            title: i.title,
                            artist: i.artist,
                            
							
							lrcContent: n.map(function(t) {
    var e, n, o, r;
    var timestamp = (n = Math.floor((e = t.start_s) / 60), o = Math.floor(e % 60), r = Math.floor(e % 1 * 100), "[".concat(n.toString().padStart(2, "0"), ":").concat(o.toString().padStart(2, "0"), ".").concat(r.toString().padStart(2, "0"), "]"));
    var word = t.word.replace(/```math\s*/g, '[').replace(/\s*```/g, ']').replace(/KATEX_INLINE_OPEN\s*/g, '(').replace(/\s*KATEX_INLINE_CLOSE/g, ')');
    return timestamp.concat(word);
}).join("\n")
                        }] : [2, {songId: t, title: i.title, artist: i.artist, lrcContent: null}]
                }
            })
        })()
    }

    n.rv = () => "1.4.11", n.ruid = "bundler=rspack@1.4.11";
    
    // Message listener for popup requests
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Content script received message:", request);
        
        if (request.action === "GET_LRC_DATA") {
            // Check if we're on a song page
            if (window.location.pathname.startsWith("/song/")) {
                s().then(function(result) {
                    sendResponse(result);
                });
                return true; // Keep the message channel open for async response
            } else {
                sendResponse({songId: null, lrcContent: null, error: "Not on a song page"});
            }
        }
        
        return false;
    });
})();