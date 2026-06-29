import { describe, expect, it } from 'vitest';
import { parseSongMetadata } from '../src/shared/songMetadata';

const ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('parseSongMetadata', () => {
    it('extracts title/artist from <title> and media from embedded JSON', () => {
        const html = `
            <html><head>
              <title>My Song by Cool Artist | Suno</title>
              <meta property="og:image" content="https://cdn1.suno.ai/image_${ID}.jpeg" />
            </head><body>
              <script>self.__next_f.push([1,"{\\"audio_url\\":\\"https://cdn1.suno.ai/${ID}.mp3\\",\\"duration\\":125.4,\\"major_model_version\\":\\"v4\\"}"])</script>
            </body></html>`;
        const meta = parseSongMetadata(html, ID);
        expect(meta.title).toBe('My Song');
        expect(meta.artist).toBe('Cool Artist');
        expect(meta.mediaUrls.audio).toBe(`https://cdn1.suno.ai/${ID}.mp3`);
        expect(meta.duration).toBe('2:05');
        expect(meta.model).toBe('v4');
    });

    it('reads artist from the description meta when title lacks it', () => {
        const html = `<head><meta name="description" content="A track by Jane Doe (@jane). Listen now."></head>`;
        expect(parseSongMetadata(html, ID).artist).toBe('Jane Doe');
    });

    it('normalizes the model to a real version and drops bare codenames', () => {
        const withVer = `<script>self.__next_f.push([1,"{\\"model_name\\":\\"chirp-v3-5-tau\\"}"])</script>`;
        expect(parseSongMetadata(withVer, ID).model).toBe('v3.5');

        const cleanVer = `<script>self.__next_f.push([1,"{\\"major_model_version\\":\\"v4\\",\\"model_name\\":\\"chirp-x\\"}"])</script>`;
        expect(parseSongMetadata(cleanVer, ID).model).toBe('v4');

        const codenameOnly = `<script>self.__next_f.push([1,"{\\"audio_url\\":\\"x\\",\\"model_name\\":\\"chirp\\"}"])</script>`;
        expect(parseSongMetadata(codenameOnly, ID).model).toBeUndefined();
    });

    it('falls back to CDN-pattern URLs when nothing is found', () => {
        const meta = parseSongMetadata('<html></html>', ID);
        expect(meta.mediaUrls.audio).toBe(`https://cdn1.suno.ai/${ID}.mp3`);
        expect(meta.mediaUrls.video).toBe(`https://cdn1.suno.ai/${ID}.mp4`);
        expect(meta.mediaUrls.image).toBe(`https://cdn1.suno.ai/image_${ID}.jpeg`);
    });
});
