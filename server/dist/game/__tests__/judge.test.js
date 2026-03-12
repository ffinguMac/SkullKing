import { describe, it, expect } from 'vitest';
import { judgeTrick, judgeTrickWithoutKrakenWhale, resolveNormalTrick, } from '../judge.js';
const mk = (playerId, card, order) => ({
    playerId,
    card,
    playOrder: order,
});
describe('judge - 트릭 판정', () => {
    it('스컬킹 단독 승리', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 10 }, 0),
            mk('B', { type: 'special', special: 'skullking' }, 1),
            mk('C', { type: 'color', suit: 'green', value: 14 }, 2),
        ];
        expect(judgeTrick(plays, 'green').winnerId).toBe('B');
    });
    it('해적 먼저 낸 사람 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'pirate' }, 0),
            mk('B', { type: 'special', special: 'pirate' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('인어+스컬킹 동시 → 인어 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'mermaid' }, 0),
            mk('B', { type: 'special', special: 'skullking' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('인어 2장 동시 → 먼저 낸 인어 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'mermaid' }, 0),
            mk('B', { type: 'special', special: 'mermaid' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('검정 최댓값 승리', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
            mk('B', { type: 'color', suit: 'black', value: 10 }, 1),
            mk('C', { type: 'color', suit: 'black', value: 14 }, 2),
        ];
        expect(judgeTrick(plays, 'green').winnerId).toBe('C');
    });
    it('리드 수트 최댓값 승리 (검정 없을 때)', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 5 }, 0),
            mk('B', { type: 'color', suit: 'green', value: 14 }, 1),
            mk('C', { type: 'color', suit: 'purple', value: 14 }, 2),
        ];
        expect(judgeTrick(plays, 'green').winnerId).toBe('B');
    });
    it('전원 탈출 → 먼저 낸 카드 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'escape' }, 0),
            mk('B', { type: 'special', special: 'escape' }, 1),
            mk('C', { type: 'special', special: 'loot' }, 2),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('전원 약탈품/탈출 → 먼저 낸 카드 승리', () => {
        const plays = [
            mk('A', { type: 'special', special: 'loot' }, 0),
            mk('B', { type: 'special', special: 'escape' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('인어 단독 승리', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
            mk('B', { type: 'special', special: 'mermaid' }, 1),
        ];
        expect(judgeTrick(plays, 'green').winnerId).toBe('B');
    });
    it('티그리스-해적 포함 해적 판정', () => {
        const plays = [
            mk('A', { type: 'special', special: 'tigress', tigressDecl: 'pirate' }, 0),
            mk('B', { type: 'special', special: 'pirate' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
    it('검정 없을 때 리드 수트 최댓값', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'purple', value: 10 }, 0),
            mk('B', { type: 'color', suit: 'purple', value: 14 }, 1),
        ];
        expect(judgeTrick(plays, 'purple').winnerId).toBe('B');
    });
    it('동률 숫자 시 먼저 낸 사람 승리', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 10 }, 0),
            mk('B', { type: 'color', suit: 'green', value: 10 }, 1),
        ];
        expect(judgeTrick(plays, 'green').winnerId).toBe('A');
    });
    it('judgeTrickWithoutKrakenWhale - 스컬킹', () => {
        const plays = [mk('A', { type: 'special', special: 'skullking' }, 0)];
        expect(judgeTrickWithoutKrakenWhale(plays, null)).toBe('A');
    });
    it('judgeTrickWithoutKrakenWhale - 해적', () => {
        const plays = [mk('A', { type: 'special', special: 'pirate' }, 0)];
        expect(judgeTrickWithoutKrakenWhale(plays, null)).toBe('A');
    });
    it('resolveNormalTrick - 검정 14', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
            mk('B', { type: 'color', suit: 'black', value: 14 }, 1),
        ];
        const r = resolveNormalTrick(plays, 'green');
        expect(r.winnerId).toBe('B');
        expect(r.isVoid).toBe(false);
    });
    it('리드 수트 없을 때 검정 우선', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
            mk('B', { type: 'color', suit: 'black', value: 5 }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('B');
    });
    it('스컬킹이 해적 이김', () => {
        const plays = [
            mk('A', { type: 'special', special: 'pirate' }, 0),
            mk('B', { type: 'special', special: 'skullking' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('B');
    });
    it('인어가 스컬킹 이김', () => {
        const plays = [
            mk('A', { type: 'special', special: 'skullking' }, 0),
            mk('B', { type: 'special', special: 'mermaid' }, 1),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('B');
    });
    it('리드 수트만 있고 검정 없을 때', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'yellow', value: 13 }, 0),
            mk('B', { type: 'color', suit: 'yellow', value: 14 }, 1),
        ];
        expect(judgeTrick(plays, 'yellow').winnerId).toBe('B');
    });
    it('리드 수트 없고 색상만 있을 때 검정 최대', () => {
        const plays = [
            mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
            mk('B', { type: 'color', suit: 'purple', value: 14 }, 1),
            mk('C', { type: 'color', suit: 'black', value: 1 }, 2),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('C');
    });
    it('3인 해적 중 첫 번째', () => {
        const plays = [
            mk('A', { type: 'special', special: 'pirate' }, 0),
            mk('B', { type: 'special', special: 'pirate' }, 1),
            mk('C', { type: 'special', special: 'pirate' }, 2),
        ];
        expect(judgeTrick(plays, null).winnerId).toBe('A');
    });
});
