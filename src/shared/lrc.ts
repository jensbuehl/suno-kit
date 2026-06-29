import type { AlignedWord } from './sunoApi';

/** Formats seconds as an LRC timestamp, e.g. 75.4 -> "[01:15.40]". */
function formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds % 1) * 100);
    return `[${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}]`;
}

/** Trims whitespace immediately inside brackets/parentheses of a single word. */
function cleanWord(word: string): string {
    return word
        .replace(/\[\s*/g, '[')
        .replace(/\s*\]/g, ']')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')');
}

/** Converts Suno's aligned-words response into LRC text. */
export function alignedWordsToLrc(words: AlignedWord[]): string {
    return words.map((w) => formatTimestamp(w.start_s) + cleanWord(w.word)).join('\n');
}
