import { describe, expect, it } from 'vitest';
import { trimLyrics } from '../src/popup/textProcessing';
import type { LyricsTrim } from '../src/shared/settings';

const rule = (over: Partial<LyricsTrim>): LyricsTrim => ({
    enabled: true,
    startAfter: '',
    endBefore: '',
    matchMode: 'contains',
    caseSensitive: false,
    ...over
});

const LRC = [
    '[00:00.00]https://suno.com/song/abc',
    '[00:02.00]First real line',
    '[00:04.00]Second real line',
    '[00:06.00]© 2026 Some Artist'
].join('\n');

describe('trimLyrics', () => {
    it('returns input unchanged when no markers are set', () => {
        expect(trimLyrics(LRC, rule({}))).toBe(LRC);
    });

    it('returns input unchanged when disabled, even with markers set', () => {
        expect(trimLyrics(LRC, rule({ enabled: false, startAfter: 'http', endBefore: '©' }))).toBe(LRC);
    });

    it('drops everything up to & including the startAfter line', () => {
        const out = trimLyrics(LRC, rule({ startAfter: 'http' }));
        expect(out).toBe('[00:02.00]First real line\n[00:04.00]Second real line\n[00:06.00]© 2026 Some Artist');
    });

    it('drops the endBefore line and everything after', () => {
        const out = trimLyrics(LRC, rule({ endBefore: '©' }));
        expect(out).toBe('[00:00.00]https://suno.com/song/abc\n[00:02.00]First real line\n[00:04.00]Second real line');
    });

    it('applies start and end together to isolate the real lyrics', () => {
        const out = trimLyrics(LRC, rule({ startAfter: 'http', endBefore: '©' }));
        expect(out).toBe('[00:02.00]First real line\n[00:04.00]Second real line');
    });

    it('matches case-insensitively by default and case-sensitively when asked', () => {
        expect(trimLyrics(LRC, rule({ endBefore: 'SOME ARTIST' }))).not.toContain('©');
        expect(trimLyrics(LRC, rule({ endBefore: 'SOME ARTIST', caseSensitive: true }))).toContain('©');
    });

    it('supports regex mode and treats an invalid pattern as inert', () => {
        expect(trimLyrics(LRC, rule({ matchMode: 'regex', startAfter: '^https?://' }))).toBe(
            '[00:02.00]First real line\n[00:04.00]Second real line\n[00:06.00]© 2026 Some Artist'
        );
        expect(trimLyrics(LRC, rule({ matchMode: 'regex', startAfter: '[invalid(' }))).toBe(LRC);
    });
});
