import { describe, expect, it } from 'vitest';
import {
    addVizzyWorkaround,
    cleanFilename,
    convertLrc,
    removePunctuation,
    stripTimestamps,
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

describe('stripTimestamps', () => {
    it('removes a leading [mm:ss.xx] from each line', () => {
        expect(stripTimestamps('[00:01.00]Hello\n[00:05.00]World')).toBe('Hello\nWorld');
    });

    it('supports 3-digit millisecond timestamps', () => {
        expect(stripTimestamps('[00:01.000]Hi')).toBe('Hi');
    });

    it('leaves lines without a timestamp untouched', () => {
        expect(stripTimestamps('no timestamp here')).toBe('no timestamp here');
    });

    it('composes with convertLrc output (timestamps-off render)', () => {
        const timed = convertLrc('[00:01.00]Hello!\n[00:02.50]there', CLEAN);
        expect(stripTimestamps(timed)).toBe('Hello there');
    });

    it('still works after stacked Clean + uppercase options', () => {
        const timed = convertLrc('[00:01.00]Hello, world!', { removePunct: true, toUpper: true, toLower: false });
        expect(timed).toBe('[00:01.00]HELLO WORLD');
        expect(stripTimestamps(timed)).toBe('HELLO WORLD');
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
