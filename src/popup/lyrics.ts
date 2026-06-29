// Bridges popup UI state (Clean / case / Timestamps) to the pure textProcessing
// helpers, so the lyrics view, Copy, and the .lrc download all agree.

import type { LyricsTrim } from '../shared/settings';
import type { CaseMode } from './state';
import { type TextOptions, addVizzyWorkaround, convertLrc, stripTimestamps, trimLyrics } from './textProcessing';

export function buildTextOptions(removePunct: boolean, caseMode: CaseMode): TextOptions {
    return {
        removePunct,
        toUpper: caseMode === 'upper',
        toLower: caseMode === 'lower'
    };
}

interface LyricsOpts {
    timestamps: boolean;
    removePunct: boolean;
    caseMode: CaseMode;
    trim: LyricsTrim;
}

// Trim runs AFTER convertLrc so markers match the lines the user actually sees —
// one converted line per timestamp ("everything between two timestamps").

/** Text shown in the lyrics box and put on the clipboard by Copy (honors toolbar). */
export function renderedLyrics(lrcContent: string, opts: LyricsOpts): string {
    const formatted = convertLrc(lrcContent, buildTextOptions(opts.removePunct, opts.caseMode));
    const trimmed = trimLyrics(formatted, opts.trim);
    return opts.timestamps ? trimmed : stripTimestamps(trimmed);
}

/** The downloadable `.lrc` text: always timed (D6), trim + Clean/case applied, + Vizzy fix. */
export function lrcFileText(
    lrcContent: string,
    removePunct: boolean,
    caseMode: CaseMode,
    trim: LyricsTrim
): string {
    const formatted = convertLrc(lrcContent, buildTextOptions(removePunct, caseMode));
    return addVizzyWorkaround(trimLyrics(formatted, trim));
}
