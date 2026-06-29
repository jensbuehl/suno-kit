import { describe, expect, it } from 'vitest';
import { classifyLoadError } from '../src/shared/loadError';

const base = { parsedSongId: 'song-1', candidateCount: 1, refreshAvailable: false };

describe('classifyLoadError', () => {
    it('bad-link when the song id could not be parsed', () => {
        expect(classifyLoadError({ ...base, parsedSongId: null }).kind).toBe('bad-link');
    });

    it('offline when a request threw', () => {
        expect(classifyLoadError({ ...base, threw: true }).kind).toBe('offline');
    });

    it('not-signed-in when there are no token candidates', () => {
        expect(classifyLoadError({ ...base, candidateCount: 0 }).kind).toBe('not-signed-in');
    });

    it('session-expired on 401, carrying refresh availability', () => {
        expect(classifyLoadError({ ...base, lastStatus: 401, refreshAvailable: true })).toEqual({
            kind: 'session-expired',
            canRefresh: true
        });
    });

    it('song-inaccessible on 403/404', () => {
        expect(classifyLoadError({ ...base, lastStatus: 403 }).kind).toBe('song-inaccessible');
        expect(classifyLoadError({ ...base, lastStatus: 404 }).kind).toBe('song-inaccessible');
    });

    it('unknown otherwise', () => {
        expect(classifyLoadError({ ...base, lastStatus: 200 }).kind).toBe('unknown');
    });
});
