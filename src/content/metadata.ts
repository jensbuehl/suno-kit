import { CDN_BASE } from '../shared/config';
import type { SongMetadata } from '../shared/types';

/** Formats a duration in seconds (possibly fractional) as "m:ss". */
function formatSeconds(seconds: number): string {
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** Extracts title, artist, and media URLs from the current Suno song page. */
export function extractSongMetadata(): SongMetadata {
    const metadata: SongMetadata = {
        title: '',
        artist: '',
        mediaUrls: { image: '', video: '' }
    };

    // Method 1: document title -> "Song Title by Artist Name | Suno"
    if (document.title) {
        const titleMatch = document.title.match(/^(.+?)\s+by\s+(.+?)\s*\|\s*Suno/);
        if (titleMatch && titleMatch.length >= 3) {
            metadata.title = titleMatch[1].trim();
            metadata.artist = titleMatch[2].trim();
        }
    }

    // Method 2: meta tags
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
        metadata.title = metadata.title || ogTitle.content.trim();
    }

    // Media URLs - prefer the on-page video element (most reliable)
    const videoElement = document.querySelector<HTMLVideoElement>('video[src*="cdn1.suno.ai/video_"]');
    if (videoElement && videoElement.src) {
        metadata.mediaUrls.video = videoElement.src;
    }

    const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (ogImage && ogImage.content) {
        metadata.mediaUrls.image = ogImage.content;
    }

    if (!metadata.mediaUrls.video) {
        const ogVideo = document.querySelector<HTMLMetaElement>('meta[property="og:video"]');
        if (ogVideo && ogVideo.content) {
            metadata.mediaUrls.video = ogVideo.content;
        }
    }

    // Method 3: artist from meta description -> "... by Artist (@handle)."
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (metaDescription && metaDescription.content) {
        const descMatch = metaDescription.content.match(/by\s+(.+?)\s*\(@/);
        if (descMatch && descMatch[1]) {
            metadata.artist = metadata.artist || descMatch[1].trim();
        }
    }

    // Method 4: data embedded in <script> tags. Suno streams it as ESCAPED JSON
    // inside self.__next_f.push("…\"audio_url\":\"…\"…"), so JSON.parse fails and a
    // naive `"key"` regex never matches the `\"key\"` text. We unescape each
    // candidate script first, then pull the real values out of it.
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const raw = scripts[i].textContent;
        if (!raw || (!raw.includes('audio_url') && !raw.includes('display_name'))) continue;

        // Rare case: a genuine pure-JSON <script> (props.pageProps).
        try {
            const pp = JSON.parse(raw)?.props?.pageProps;
            if (pp) {
                const clip = pp.clip || pp.song || {};
                metadata.mediaUrls.image = metadata.mediaUrls.image || pp.imageUrl || clip.image_url || '';
                metadata.mediaUrls.video = metadata.mediaUrls.video || pp.videoUrl || clip.video_url || '';
                metadata.mediaUrls.audio = metadata.mediaUrls.audio || pp.audioUrl || clip.audio_url;
                const dur = clip.duration ?? pp.duration;
                if (!metadata.duration && typeof dur === 'number') metadata.duration = formatSeconds(dur);
                metadata.model = metadata.model || clip.major_model_version || clip.model_name;
            }
        } catch {
            // Streaming/escaped chunk — handled by the regex pass below.
        }

        // Unescape the JS-string escaping, then extract the real values.
        const text = raw.replace(/\\"/g, '"').replace(/\\u002[fF]/gi, '/').replace(/\\\//g, '/');
        const grab = (re: RegExp): string => {
            const m = text.match(re);
            return m && m[1] ? m[1] : '';
        };
        if (!metadata.mediaUrls.image) metadata.mediaUrls.image = grab(/"image(?:Url|_url)"\s*:\s*"([^"]+)"/);
        if (!metadata.mediaUrls.video) metadata.mediaUrls.video = grab(/"video(?:Url|_url)"\s*:\s*"([^"]+)"/);
        if (!metadata.mediaUrls.audio) {
            const a = grab(/"audio(?:Url|_url)"\s*:\s*"([^"]+)"/);
            if (a) metadata.mediaUrls.audio = a;
        }
        if (!metadata.duration) {
            const d = grab(/"duration"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
            if (d) metadata.duration = formatSeconds(parseFloat(d));
        }
        if (!metadata.model) {
            const m = grab(/"(?:major_model_version|model_name)"\s*:\s*"([^"]+)"/);
            if (m) metadata.model = m;
        }
    }

    // Last-resort CDN fallbacks (only if extraction above came up empty). These
    // are best-effort guesses — the real URLs from the embedded JSON are preferred.
    const songId = window.location.pathname.split('/')[2];
    if (!metadata.mediaUrls.image && songId) {
        metadata.mediaUrls.image = `${CDN_BASE}/image_${songId}.jpeg`;
    }
    if (!metadata.mediaUrls.video && songId) {
        metadata.mediaUrls.video = `${CDN_BASE}/${songId}.mp4`;
    }
    if (!metadata.mediaUrls.audio && songId) {
        metadata.mediaUrls.audio = `${CDN_BASE}/${songId}.mp3`;
    }

    return metadata;
}
