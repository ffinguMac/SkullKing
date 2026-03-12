import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle, deal } from '../deck.js';
describe('deck', () => {
    it('buildDeck 74장', () => {
        const deck = buildDeck();
        expect(deck.length).toBe(74);
    });
    it('색상 카드 56장', () => {
        const deck = buildDeck();
        const colors = deck.filter((c) => c.type === 'color');
        expect(colors.length).toBe(56);
    });
    it('해적 5, 탈출 5, 인어 2, 스컬킹 1, 티그리스 1', () => {
        const deck = buildDeck();
        expect(deck.filter((c) => c.type === 'special' && c.special === 'pirate').length).toBe(5);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'escape').length).toBe(5);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'mermaid').length).toBe(2);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'skullking').length).toBe(1);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'tigress').length).toBe(1);
    });
    it('약탈품 2, 크라켄 1, 흰고래 1', () => {
        const deck = buildDeck();
        expect(deck.filter((c) => c.type === 'special' && c.special === 'loot').length).toBe(2);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'kraken').length).toBe(1);
        expect(deck.filter((c) => c.type === 'special' && c.special === 'whale').length).toBe(1);
    });
    it('shuffle seed 동일 시 동일 결과', () => {
        const d = buildDeck();
        const a = shuffle(d, 123);
        const b = shuffle(d, 123);
        expect(a.map((c) => JSON.stringify(c))).toEqual(b.map((c) => JSON.stringify(c)));
    });
    it('deal 4인 1라운드(1장씩)', () => {
        const deck = buildDeck();
        const hands = deal(deck, 4, 1);
        expect(hands.length).toBe(4);
        expect(hands.every((h) => h.length === 1)).toBe(true);
    });
    it('deal 2인 5라운드(5장씩)', () => {
        const deck = buildDeck();
        const hands = deal(deck, 2, 5);
        expect(hands.length).toBe(2);
        expect(hands[0].length).toBe(5);
        expect(hands[1].length).toBe(5);
    });
});
