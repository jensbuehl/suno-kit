import type { SongMetadata } from '../shared/types';

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

    // Method 4: React/Next.js data embedded in <script> tags
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const scriptContent = scripts[i].textContent;
        if (scriptContent && scriptContent.includes('display_name')) {
            try {
                const data = JSON.parse(scriptContent);
                if (data?.props?.pageProps) {
                    metadata.mediaUrls.image = metadata.mediaUrls.image || data.props.pageProps.imageUrl;
                    metadata.mediaUrls.video = metadata.mediaUrls.video || data.props.pageProps.videoUrl;
                }
            } catch {
                // Not valid JSON - fall back to regex extraction.
                const displayNameMatch = scriptContent.match(/"display_name"\s*:\s*"([^"]+)"/);
                if (displayNameMatch && displayNameMatch[1] && !metadata.artist) {
                    metadata.artist = displayNameMatch[1];
                }
                const titleMatch = scriptContent.match(/"title"\s*:\s*"([^"]+)"/);
                if (titleMatch && titleMatch[1] && !metadata.title) {
                    metadata.title = titleMatch[1].trim();
                }
                const imageMatch = scriptContent.match(/"imageUrl"\s*:\s*"([^"]+)"/);
                if (imageMatch && imageMatch[1] && !metadata.mediaUrls.image) {
                    metadata.mediaUrls.image = imageMatch[1];
                }
                const videoMatch = scriptContent.match(/"videoUrl"\s*:\s*"([^"]+)"/);
                if (videoMatch && videoMatch[1] && !metadata.mediaUrls.video) {
                    metadata.mediaUrls.video = videoMatch[1];
                }
            }
        }
    }

    // Ensure both URLs exist by falling back to the conventional CDN paths.
    const songId = window.location.pathname.split('/')[2];
    if (!metadata.mediaUrls.image) {
        metadata.mediaUrls.image = `https://cdn1.suno.ai/${songId}/cover.jpg`;
    }
    if (!metadata.mediaUrls.video) {
        metadata.mediaUrls.video = `https://cdn1.suno.ai/${songId}/visualizer.mp4`;
    }

    return metadata;
}
