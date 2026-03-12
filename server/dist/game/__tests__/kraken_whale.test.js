import { describe, it, expect } from 'vitest';
import { judgeTrick, resolveKrakenEffect, resolveWhaleEffect } from '../judge.js';
const mk = (playerId, card, order) => ({
    playerId,
    card,
    playOrder: order,
});
describe('크라켄/흰고래', () => {
    it('크라켄 단독 → VOID, wouldHaveWonId', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 10 }, 0),
            mk('B', { type: 'special', special: 'kraken' }, 1),
        ];
        const r = judgeTrick(plays, 'green');
        expect(r.isVoid).toBe(true);
        expect(r.winnerId).toBeNull();
        expect(r.wouldHaveWonId).toBe('A');
    });
    it('흰고래 단독, 숫자 있음 → 숫자 최대 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'whale' }, 0),
            mk('B', { type: 'color', suit: 'green', value: 14 }, 1),
            mk('C', { type: 'color', suit: 'green', value: 10 }, 2),
        ];
        const r = judgeTrick(plays, null);
        expect(r.winnerId).toBe('B');
        expect(r.isVoid).toBe(false);
    });
    it('흰고래 단독, 숫자 없음 → VOID, whalePlayerId', () => {
        const plays = [
            mk('A', { type: 'special', special: 'whale' }, 0),
            mk('B', { type: 'special', special: 'escape' }, 1),
        ];
        const r = judgeTrick(plays, null);
        expect(r.isVoid).toBe(true);
        expect(r.winnerId).toBeNull();
        expect(r.whalePlayerId).toBe('A');
    });
    it('크라켄+흰고래 동시, 크라켄이 더 나중 → 크라켄 효과', () => {
        const plays = [
            mk('A', { type: 'special', special: 'whale' }, 0),
            mk('B', { type: 'color', suit: 'green', value: 14 }, 1),
            mk('C', { type: 'special', special: 'kraken' }, 2),
        ];
        const r = judgeTrick(plays, null);
        expect(r.isVoid).toBe(true);
        expect(r.wouldHaveWonId).toBe('B');
    });
    it('크라켄+흰고래 동시, 흰고래가 더 나중 → 흰고래 효과', () => {
        const plays = [
            mk('A', { type: 'special', special: 'kraken' }, 0),
            mk('B', { type: 'color', suit: 'green', value: 14 }, 1),
            mk('C', { type: 'special', special: 'whale' }, 2),
        ];
        const r = judgeTrick(plays, null);
        expect(r.winnerId).toBe('B');
        expect(r.isVoid).toBe(false);
    });
    it('흰고래 효과 - 동률 숫자 시 먼저 낸 사람', () => {
        const plays = [
            mk('A', { type: 'special', special: 'whale' }, 0),
            mk('B', { type: 'color', suit: 'green', value: 10 }, 1),
            mk('C', { type: 'color', suit: 'purple', value: 10 }, 2),
        ];
        const r = resolveWhaleEffect(plays);
        expect(r.winnerId).toBe('B');
    });
    it('resolveKrakenEffect - wouldHaveWonId 반환', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'black', value: 14 }, 0),
            mk('B', { type: 'special', special: 'kraken' }, 1),
        ];
        const r = resolveKrakenEffect(plays);
        expect(r.wouldHaveWonId).toBe('A');
    });
});
