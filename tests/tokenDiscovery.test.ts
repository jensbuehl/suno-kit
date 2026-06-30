import { describe, expect, it } from 'vitest';
import { isLikelyJwt } from '../src/shared/tokenDiscovery';

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
