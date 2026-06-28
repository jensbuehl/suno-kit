import { zipSync } from 'fflate';
import { cleanFilename } from './textProcessing';

export interface ZipItem {
    name: string;
    bytes: Uint8Array;
}

export interface ZipManifest {
    /** In-memory lyrics entry (raw timed .lrc) — no fetch needed. */
    lyrics?: { name: string; text: string };
    /** Remote assets to fetch via the background broker before zipping. */
    fetch: { key: 'audio' | 'cover' | 'video'; name: string; url: string }[];
}

interface ManifestArgs {
    selection: { lyrics: boolean; audio: boolean; cover: boolean; video: boolean };
    title: string;
    lrcContent: string;
    mediaUrls: { image?: string; video?: string; audio?: string };
}

/**
 * Pure: decides which assets to include and their archive filenames from the
 * current selection + song. Lyrics ship as the raw timed `.lrc` (D3); a selected
 * asset with no URL is simply omitted (§8). No network here — the caller fetches.
 */
export function buildManifest(args: ManifestArgs): ZipManifest {
    const { selection, title, lrcContent, mediaUrls } = args;
    const cleanTitle = cleanFilename(title) || 'song';
    const manifest: ZipManifest = { fetch: [] };

    if (selection.lyrics && lrcContent) {
        manifest.lyrics = { name: `${cleanTitle}.lrc`, text: lrcContent };
    }
    if (selection.audio && mediaUrls.audio) {
        manifest.fetch.push({ key: 'audio', name: `${cleanTitle}.mp3`, url: mediaUrls.audio });
    }
    if (selection.cover && mediaUrls.image) {
        manifest.fetch.push({ key: 'cover', name: 'cover.jpg', url: mediaUrls.image });
    }
    if (selection.video && mediaUrls.video) {
        manifest.fetch.push({ key: 'video', name: 'visualizer.mp4', url: mediaUrls.video });
    }

    return manifest;
}

/** Assembles a single `.zip` Blob from already-fetched items via fflate. */
export function makeZipBlob(items: ZipItem[]): Blob {
    const files: Record<string, Uint8Array> = {};
    for (const item of items) {
        files[item.name] = item.bytes;
    }
    const zipped = zipSync(files);
    // Copy into a fresh ArrayBuffer-backed view so the Blob owns standalone bytes.
    return new Blob([zipped.slice()], { type: 'application/zip' });
}
