// Pure parsing of a Suno song reference. Never throws.

/** Suno song ids are UUIDs (8-4-4-4-12 hex). */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
/** Relaxed id charset accepted when it appears after `/song/` in a Suno URL. */
const PATH_ID_RE = /^[A-Za-z0-9_-]{8,}$/;

/**
 * Returns the song id for a valid Suno song link or a bare song id, else null.
 * Accepts `https://suno.com/song/<id>` (with/without www, query, hash, trailing
 * slash, http/https) and a bare UUID. Rejects profile/playlist/home/search and
 * non-Suno URLs.
 */
export function parseSongId(input: string): string | null {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!s) return null;

    // Bare id (must be an unambiguous UUID).
    if (UUID_RE.test(s)) return s.toLowerCase();

    let url: URL;
    try {
        url = new URL(s);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'suno.com' && !host.endsWith('.suno.com')) return null;

    const segs = url.pathname.split('/').filter(Boolean);
    const songIdx = segs.indexOf('song');
    if (songIdx === -1 || songIdx + 1 >= segs.length) return null;

    const id = segs[songIdx + 1];
    return PATH_ID_RE.test(id) ? id : null;
}
