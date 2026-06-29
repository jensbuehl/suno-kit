import { describe, expect, it } from 'vitest';
import { describeCandidate, isLikelyJwt, makeCandidateId } from '../src/shared/tokenDiscovery';

describe('isLikelyJwt', () => {
    it('accepts a three-part base64url token', () => {
        expect(isLikelyJwt('aaa.bbb.ccc')).toBe(true);
        expect(isLikelyJwt('eyJhbGc.eyJzdWI.sig-NaTuRe_123')).toBe(true);
    });

    it('trims surrounding whitespace before checking', () => {
        expect(isLikelyJwt('  aaa.bbb.ccc  ')).toBe(true);
    });

    it('rejects tokens without exactly three parts', () => {
        expect(isLikelyJwt('aaa.bbb')).toBe(false);
        expect(isLikelyJwt('aaa.bbb.ccc.ddd')).toBe(false);
    });

    it('rejects empty and non-string values', () => {
        expect(isLikelyJwt('')).toBe(false);
        expect(isLikelyJwt(null)).toBe(false);
        expect(isLikelyJwt(123)).toBe(false);
    });
});

describe('makeCandidateId', () => {
    it('combines path and source', () => {
        expect(makeCandidateId({ token: 't', source: 'cookie:__session', path: 'Weg 2' })).toBe(
            'Weg 2|cookie:__session'
        );
    });
});

describe('describeCandidate', () => {
    it('describes a browser session cookie by name', () => {
        expect(describeCandidate({ token: 't', source: 'cookie-api:auth.suno.com/__client', path: 'Weg 1' })).toBe(
            'Browser session cookie (__client)'
        );
    });

    it('describes a page cookie by name', () => {
        expect(describeCandidate({ token: 't', source: 'cookie:__session', path: 'Weg 2' })).toBe(
            'Page cookie (__session)'
        );
    });

    it('labels Clerk local storage clearly', () => {
        expect(describeCandidate({ token: 't', source: 'localStorage:clerk.client.abc', path: 'Weg 3' })).toBe(
            'Local storage (Clerk session)'
        );
    });
});
