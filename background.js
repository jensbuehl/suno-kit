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