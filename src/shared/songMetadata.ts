import { CDN_BASE } from './config';
import type { SongMetadata } from './types';

// DOM-free extraction from fetched song-page HTML, so the popup can resolve a
// song's title/artist/media without an active Suno tab. Pure string/regex work
// (mirrors the previous content-script scraping) — no DOMParser, fully testable.

/** Formats a duration in seconds (possibly fractional) as "m:ss". */
function formatSeconds(seconds: number): string {
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Normalizes Suno's model field to a real version token (e.g. "v4", "v3.5").
 * Bare codenames like "chirp" carry no version → undefined, so the UI hides it
 * rather than showing a meaningless name.
 */
function normalizeModel(raw: string): string | undefined {
    if (!raw) return undefined;
    const m = raw.match(/v?\d+(?:[._-]\d+)?/i);
    if (!m) return undefined;
    let v = m[0].replace(/[_-]/g, '.');
    if (!/^v/i.test(v)) v = `v${v}`;
    return v.toLowerCase();
}

/** Reads `<meta>` content by property/name, tolerating attribute order. */
function metaContent(html: string, key: string): string {
    const tags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of tags) {
        const prop = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i);
        if (!prop || prop[1].toLowerCase() !== key) continue;
        const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
        if (content) return content[1];
    }
    return '';
}

/** Extracts song metadata from raw page HTML (popup path — no live DOM needed). */
export function parseSongMetadata(html: string, songId: string): SongMetadata {
    const metadata: SongMetadata = {
        title: '',
        artist: '',
        mediaUrls: { image: '', video: '' }
    };
    const src = html || '';

    // Title/artist: <title> "Song Title by Artist | Suno", then og:title.
    const titleTag = src.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleTag) {
        const m = titleTag[1].match(/^(.+?)\s+by\s+(.+?)\s*\|\s*Suno/);
        if (m && m.length >= 3) {
            metadata.title = m[1].trim();
            metadata.artist = m[2].trim();
        }
    }
    metadata.title = metadata.title || metaContent(src, 'og:title').trim();

    metadata.mediaUrls.image = metaContent(src, 'og:image');
    metadata.mediaUrls.video = metaContent(src, 'og:video');

    // Artist from description -> "... by Artist (@handle)."
    if (!metadata.artist) {
        const desc = metaContent(src, 'description').match(/by\s+(.+?)\s*\(@/);
        if (desc && desc[1]) metadata.artist = desc[1].trim();
    }

    // Embedded data: Suno streams ESCAPED JSON in self.__next_f.push("…\"audio_url\":…").
    // Unescape the whole document once, then pull the real values out.
    const text = src.replace(/\\"/g, '"').replace(/\\u002[fF]/gi, '/').replace(/\\\//g, '/');
    const grab = (re: RegExp): string => {
        const m = text.match(re);
        return m && m[1] ? m[1] : '';
    };
    if (!metadata.mediaUrls.image) metadata.mediaUrls.image = grab(/"image(?:Url|_url)"\s*:\s*"([^"]+)"/);
    if (!metadata.mediaUrls.video) metadata.mediaUrls.video = grab(/"video(?:Url|_url)"\s*:\s*"([^"]+)"/);
    const audio = grab(/"audio(?:Url|_url)"\s*:\s*"([^"]+)"/);
    if (audio) metadata.mediaUrls.audio = audio;
    const dur = grab(/"duration"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
    if (dur) metadata.duration = formatSeconds(parseFloat(dur));
    // Prefer the clean version field; fall back to the codename, then normalize
    // to a real version token (drops bare "chirp" with no version).
    const rawModel =
        grab(/"major_model_version"\s*:\s*"([^"]+)"/) || grab(/"model_name"\s*:\s*"([^"]+)"/);
    const model = normalizeModel(rawModel);
    if (model) metadata.model = model;

    // Last-resort CDN fallbacks (only when extraction came up empty). Best-effort —
    // the real URLs from the embedded JSON are always preferred.
    if (!metadata.mediaUrls.image && songId) metadata.mediaUrls.image = `${CDN_BASE}/image_${songId}.jpeg`;
    if (!metadata.mediaUrls.video && songId) metadata.mediaUrls.video = `${CDN_BASE}/${songId}.mp4`;
    if (!metadata.mediaUrls.audio && songId) metadata.mediaUrls.audio = `${CDN_BASE}/${songId}.mp3`;

    return metadata;
}
