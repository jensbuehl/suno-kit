import { describe, expect, it } from 'vitest';
import { alignedWordsToLrc } from '../src/content/lrc';

describe('alignedWordsToLrc', () => {
    it('formats start times as LRC timestamps', () => {
        expect(alignedWordsToLrc([{ word: 'Hello', start_s: 1.5 }])).toBe('[00:01.50]Hello');
    });

    it('pads minutes and seconds', () => {
        expect(alignedWordsToLrc([{ word: 'x', start_s: 65.5 }])).toBe('[01:05.50]x');
    });

    it('trims whitespace inside brackets and parentheses', () => {
        expect(alignedWordsToLrc([{ word: '[ x ]', start_s: 0 }])).toBe('[00:00.00][x]');
        expect(alignedWordsToLrc([{ word: '( y )', start_s: 0 }])).toBe('[00:00.00](y)');
    });

    it('joins multiple words with newlines', () => {
        const lrc = alignedWordsToLrc([
            { word: 'a', start_s: 0 },
            { word: 'b', start_s: 1 }
        ]);
        expect(lrc).toBe('[00:00.00]a\n[00:01.00]b');
    });
});
