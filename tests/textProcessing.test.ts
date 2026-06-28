import { describe, expect, it } from 'vitest';
import {
    addVizzyWorkaround,
    cleanFilename,
    convertLrc,
    removePunctuation,
    type TextOptions
} from '../src/popup/textProcessing';

const NONE: TextOptions = { removePunct: false, toUpper: false, toLower: false };
const CLEAN: TextOptions = { removePunct: true, toUpper: false, toLower: false };

describe('removePunctuation', () => {
    it('removes punctuation and collapses whitespace', () => {
        expect(removePunctuation('Hello, world!')).toBe('Hello world');
    });

    it('removes emoji', () => {
        expect(removePunctuation('hey 😀 you')).toBe('hey you');
    });

    it('strips a variety of punctuation marks', () => {
        expect(removePunctuation('a—b…c(d)e')).toBe('abcde');
    });
});

describe('cleanFilename', () => {
    it('removes characters illegal in filenames', () => {
        expect(cleanFilename('a/b:c*d?e"f<g>h|i')).toBe('abcdefghi');
    });

    it('collapses whitespace and trims', () => {
        expect(cleanFilename('  Artist   -  Title  ')).toBe('Artist - Title');
    });
});

describe('convertLrc', () => {
    it('joins a verse onto its first timestamp and cleans punctuation', () => {
        const input = '[00:01.00]Hello [world]\n[00:02.50]Line two!\n\n[00:05.00]Verse two, line';
        expect(convertLrc(input, CLEAN)).toBe('[00:01.00]Hello Line two\n[00:05.00]Verse two line');
    });

    it('keeps punctuation when removePunct is off', () => {
        expect(convertLrc('[00:01.00]Line two!', NONE)).toBe('[00:01.00]Line two!');
    });

    it('uppercases when toUpper is set', () => {
        expect(convertLrc('[00:01.00]hello', { ...NONE, toUpper: true })).toBe('[00:01.00]HELLO');
    });

    it('uses the first timestamp seen when a verse starts without one', () => {
        expect(convertLrc('no timestamps here\n[00:09.99]later', NONE)).toBe(
            '[00:09.99]no timestamps here later'
        );
    });

    it('returns empty string for empty input', () => {
        expect(convertLrc('', NONE)).toBe('');
    });
});

describe('addVizzyWorkaround', () => {
    it('duplicates the last line +2 seconds', () => {
        expect(addVizzyWorkaround('[00:01.00]line')).toBe('[00:01.00]line\n[00:03.00]line');
    });

    it('rolls seconds over into minutes', () => {
        expect(addVizzyWorkaround('[00:59.00]x')).toBe('[00:59.00]x\n[01:01.00]x');
    });

    it('returns input unchanged when the last line has no timestamp', () => {
        expect(addVizzyWorkaround('plain text')).toBe('plain text');
    });
});
