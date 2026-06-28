// Bridges popup UI state (Clean / case / Timestamps) to the pure textProcessing
// helpers, so the lyrics view, Copy, and the .lrc download all agree.

import type { CaseMode } from './state';
import { type TextOptions, addVizzyWorkaround, convertLrc, stripTimestamps } from './textProcessing';

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
}

/** Text shown in the lyrics box and put on the clipboard by Copy (honors toolbar). */
export function renderedLyrics(lrcContent: string, opts: LyricsOpts): string {
    const formatted = convertLrc(lrcContent, buildTextOptions(opts.removePunct, opts.caseMode));
    return opts.timestamps ? formatted : stripTimestamps(formatted);
}

/** The downloadable `.lrc` text: always timed (D6), Clean/case applied, + Vizzy fix. */
export function lrcFileText(lrcContent: string, removePunct: boolean, caseMode: CaseMode): string {
    return addVizzyWorkaround(convertLrc(lrcContent, buildTextOptions(removePunct, caseMode)));
}
