import { describe, expect, it } from 'vitest';
import { buildManifest } from '../src/popup/zip';

const ALL = { lyrics: true, audio: true, cover: true, video: true };
const MEDIA = {
    image: 'https://cdn1.suno.ai/cover.jpg',
    video: 'https://cdn1.suno.ai/visualizer.mp4',
    audio: 'https://cdn1.suno.ai/audio.mp3'
};

describe('buildManifest', () => {
    it('builds lyrics + all fetchable assets with cleaned names', () => {
        const m = buildManifest({ selection: ALL, title: 'Airport', lrcContent: '[00:01.00]hi', mediaUrls: MEDIA });
        expect(m.lyrics).toEqual({ name: 'Airport.lrc', text: '[00:01.00]hi' });
        expect(m.fetch).toEqual([
            { key: 'audio', name: 'Airport.mp3', url: MEDIA.audio },
            { key: 'cover', name: 'cover.jpg', url: MEDIA.image },
            { key: 'video', name: 'visualizer.mp4', url: MEDIA.video }
        ]);
    });

    it('uses the raw timed lrc independent of toolbar state', () => {
        const m = buildManifest({
            selection: { lyrics: true, audio: false, cover: false, video: false },
            title: 'Song',
            lrcContent: '[00:01.00]TIMED',
            mediaUrls: {}
        });
        expect(m.lyrics?.text).toBe('[00:01.00]TIMED');
        expect(m.fetch).toEqual([]);
    });

    it('omits unselected items', () => {
        const m = buildManifest({
            selection: { lyrics: false, audio: true, cover: false, video: false },
            title: 'Song',
            lrcContent: 'x',
            mediaUrls: MEDIA
        });
        expect(m.lyrics).toBeUndefined();
        expect(m.fetch.map((f) => f.key)).toEqual(['audio']);
    });

    it('skips selected assets whose URL is absent (§8 known-unavailable)', () => {
        const m = buildManifest({
            selection: ALL,
            title: 'Song',
            lrcContent: 'x',
            mediaUrls: { image: MEDIA.image } // no audio/video
        });
        expect(m.fetch.map((f) => f.key)).toEqual(['cover']);
    });

    it('sanitizes illegal filename characters in the title', () => {
        const m = buildManifest({ selection: ALL, title: 'A/B:C?', lrcContent: 'x', mediaUrls: MEDIA });
        expect(m.lyrics?.name).toBe('ABC.lrc');
    });

    it('falls back to "song" when the title is empty', () => {
        const m = buildManifest({ selection: ALL, title: '', lrcContent: 'x', mediaUrls: {} });
        expect(m.lyrics?.name).toBe('song.lrc');
    });
});
