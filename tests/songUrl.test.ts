import { describe, expect, it } from 'vitest';
import { parseSongId } from '../src/shared/songUrl';

const ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('parseSongId', () => {
    it('parses a canonical song URL', () => {
        expect(parseSongId(`https://suno.com/song/${ID}`)).toBe(ID);
    });

    it('tolerates www, query, hash, and trailing slash', () => {
        expect(parseSongId(`https://www.suno.com/song/${ID}/`)).toBe(ID);
        expect(parseSongId(`https://suno.com/song/${ID}?sh=abc`)).toBe(ID);
        expect(parseSongId(`http://suno.com/song/${ID}#t=10`)).toBe(ID);
    });

    it('accepts a bare UUID', () => {
        expect(parseSongId(`  ${ID}  `)).toBe(ID);
    });

    it('rejects non-song Suno URLs', () => {
        expect(parseSongId('https://suno.com/@someartist')).toBeNull();
        expect(parseSongId('https://suno.com/playlist/' + ID)).toBeNull();
        expect(parseSongId('https://suno.com/')).toBeNull();
        expect(parseSongId('https://suno.com/create')).toBeNull();
    });

    it('rejects non-Suno hosts and garbage', () => {
        expect(parseSongId(`https://evil.com/song/${ID}`)).toBeNull();
        expect(parseSongId('not a url')).toBeNull();
        expect(parseSongId('')).toBeNull();
        expect(parseSongId('12345')).toBeNull();
    });
});
