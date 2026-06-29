// Pure lyric/text-processing helpers. No DOM or extension API access, so these
// are unit-testable in isolation.

import type { LyricsTrim } from '../shared/settings';

const TS_PREFIX = /^\s*\[\d{2}:\d{2}\.\d{2,3}\]\s*/;

/**
 * Drops boilerplate lines around the real lyrics, per the user's trim rule:
 * everything up to & including the `startAfter` marker line, and the `endBefore`
 * marker line plus everything after it. Each Suno aligned-lyrics entry is one
 * line, so matching is line-level. Matches against the text (timestamp stripped).
 */
export function trimLyrics(lrc: string, rule: LyricsTrim): string {
    if (!rule.enabled) return lrc;
    const startAfter = rule.startAfter.trim();
    const endBefore = rule.endBefore.trim();
    if (!startAfter && !endBefore) return lrc;

    const lines = lrc.split('\n');
    const textOf = (line: string): string => line.replace(TS_PREFIX, '');
    const tester = (marker: string): ((line: string) => boolean) => {
        if (rule.matchMode === 'regex') {
            let re: RegExp;
            try {
                re = new RegExp(marker, rule.caseSensitive ? '' : 'i');
            } catch {
                return () => false; // invalid pattern → rule is inert, never throws
            }
            return (line) => re.test(textOf(line));
        }
        const needle = rule.caseSensitive ? marker : marker.toLowerCase();
        return (line) =>
            (rule.caseSensitive ? textOf(line) : textOf(line).toLowerCase()).includes(needle);
    };

    let start = 0;
    let end = lines.length;
    if (startAfter) {
        const hit = lines.findIndex(tester(startAfter));
        if (hit !== -1) start = hit + 1;
    }
    if (endBefore) {
        const test = tester(endBefore);
        for (let i = start; i < end; i++) {
            if (test(lines[i])) {
                end = i;
                break;
            }
        }
    }
    return lines.slice(start, end).join('\n');
}

export interface TextOptions {
    removePunct: boolean;
    toUpper: boolean;
    toLower: boolean;
}

// Punctuation characters stripped during text cleaning.
const PUNCTUATION_TO_REMOVE = [
    '-', ',', '?', '*', '"', '–', '!', '„', '“',
    '.', ':', '”', '‘',
    ';', '¿', '¡', '…', '—', '(', ')', '{', '}', '/', '\\',
    '«', '»', '‹', '›', '〈', '〉', '《', '》', '〔', '〕',
    '~'
];

export function removePunctuation(text: string): string {
    let result = text;
    for (const char of PUNCTUATION_TO_REMOVE) {
        while (result.indexOf(char) !== -1) {
            result = result.replace(char, '');
        }
    }

    // Remove emojis across the common Unicode ranges.
    result = result.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    result = result.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
    result = result.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
    result = result.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    result = result.replace(/[\u{2600}-\u{26FF}]/gu, '');
    result = result.replace(/[\u{2700}-\u{27BF}]/gu, '');
    result = result.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    result = result.replace(/[\u{1FA70}-\u{1FAFF}]/gu, '');

    return result.replace(/\s+/g, ' ').trim();
}

/** Strips characters that are illegal in filenames. */
export function cleanFilename(filename: string): string {
    return filename
        .replace(/[<>:"/|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Removes square brackets and their contents (always applied first). */
export function removeBrackets(text: string): string {
    return text.replace(/\[[^\]]*\]/g, '');
}

export function cleanLyricsText(text: string): string {
    return text
        .replace(/([(])\s+/g, '$1') // remove space directly after an opening bracket
        .replace(/„ +/g, '„') // remove spaces after German opening quotes
        .replace(/“ +/g, '“') // remove spaces after double quotes
        .replace(/‘ +/g, '‘') // remove spaces after single quotes
        .replace(/\s+/g, ' ')
        .trim();
}

/** Applies the active cleaning options to a piece of lyric text. */
export function applyTextOptions(text: string, opts: TextOptions): string {
    text = removeBrackets(text);
    if (opts.removePunct) text = removePunctuation(text);
    if (opts.toUpper) text = text.toUpperCase();
    if (opts.toLower) text = text.toLowerCase();
    return text;
}

/** Reformats raw LRC into one line per verse, applying the chosen options. */
export function convertLrc(lrcContent: string, opts: TextOptions): string {
    const lines = lrcContent.split('\n');
    let result = '';
    let currentVerse: string[] = [];
    let firstTimestamp = '';

    function flushVerse(): void {
        if (currentVerse.length === 0) return;
        const verseText = cleanLyricsText(applyTextOptions(currentVerse.join(' ').trim(), opts));
        result += `[${firstTimestamp}]${verseText}\n`;
        currentVerse = [];
        firstTimestamp = '';
    }

    for (const line of lines) {
        if (line.trim() === '') {
            flushVerse();
            continue;
        }

        const timeMatches: string[] = [];
        let textPart = line;
        let pos = 0;

        while (pos < textPart.length) {
            const openBracketPos = textPart.indexOf('[', pos);
            if (openBracketPos === -1) break;

            const closeBracketPos = textPart.indexOf(']', openBracketPos);
            if (closeBracketPos === -1) break;

            const content = textPart.substring(openBracketPos + 1, closeBracketPos);
            if (/^\d{2}:\d{2}\.\d{2,3}$/.test(content)) {
                timeMatches.push(content);
            }
            textPart = textPart.substring(0, openBracketPos) + textPart.substring(closeBracketPos + 1);
            pos = openBracketPos;
        }

        textPart = textPart.trim();

        if (timeMatches.length > 0 && firstTimestamp === '') {
            firstTimestamp = timeMatches[0];
        }

        if (textPart) {
            textPart = applyTextOptions(textPart, opts);
            if (textPart) currentVerse.push(textPart);
        }
    }

    flushVerse();

    return result.trim();
}

/**
 * Strips a leading `[mm:ss.xx]` timestamp from each line, for on-screen render
 * and Copy when the Timestamps toggle is off. Does NOT touch the `.lrc` download
 * path, which always stays timed (spec §3.4, D6). `convertLrc`'s contract is
 * unchanged — this is a pure post-step.
 */
export function stripTimestamps(lrc: string): string {
    return lrc
        .split('\n')
        .map((line) => line.replace(/^\s*\[\d{2}:\d{2}\.\d{2,3}\]\s*/, ''))
        .join('\n');
}

/** Duplicates the last LRC line +2 seconds (workaround for the Vizzy player). */
export function addVizzyWorkaround(lrcContent: string): string {
    if (!lrcContent || !lrcContent.trim()) return lrcContent;

    const lines = lrcContent.trim().split('\n');
    if (lines.length === 0) return lrcContent;

    const lastLine = lines[lines.length - 1];
    const timestampMatch = lastLine.match(/^\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (!timestampMatch) return lrcContent;

    let minutes = parseInt(timestampMatch[1], 10);
    let seconds = parseInt(timestampMatch[2], 10);
    const milliseconds = parseInt(timestampMatch[3], 10);

    seconds += 2;
    if (seconds >= 60) {
        minutes += Math.floor(seconds / 60);
        seconds = seconds % 60;
    }

    const newTimestamp =
        `${String(minutes).padStart(2, '0')}:` +
        `${String(seconds).padStart(2, '0')}.` +
        `${String(milliseconds).padStart(2, '0')}`;

    const duplicatedLine = lastLine.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, `[${newTimestamp}]`);
    return `${lrcContent}\n${duplicatedLine}`;
}
