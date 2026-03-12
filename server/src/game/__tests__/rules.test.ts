import { describe, it, expect } from 'vitest';
import { normalizeCard, isSuitCard, isEscapeLike, isCharacterCard, canPlayCard } from '../rules.js';

describe('rules', () => {
  it('normalizeCard 복사', () => {
    const card = { type: 'color' as const, suit: 'green' as const, value: 14 };
    const n = normalizeCard(card);
    expect(n).toEqual(card);
    expect(n).not.toBe(card);
  });

  it('isSuitCard', () => {
    expect(isSuitCard({ type: 'color', suit: 'green', value: 5 })).toBe(true);
    expect(isSuitCard({ type: 'special', special: 'pirate' })).toBe(false);
  });

  it('isEscapeLike - escape만', () => {
    expect(isEscapeLike({ type: 'special', special: 'escape' })).toBe(true);
    expect(isEscapeLike({ type: 'special', special: 'pirate' })).toBe(false);
  });

  it('isCharacterCard - pirate, mermaid, skullking, kraken, whale', () => {
    expect(isCharacterCard({ type: 'special', special: 'pirate' })).toBe(true);
    expect(isCharacterCard({ type: 'special', special: 'mermaid' })).toBe(true);
    expect(isCharacterCard({ type: 'special', special: 'skullking' })).toBe(true);
    expect(isCharacterCard({ type: 'special', special: 'kraken' })).toBe(true);
    expect(isCharacterCard({ type: 'special', special: 'whale' })).toBe(true);
    expect(isCharacterCard({ type: 'special', special: 'escape' })).toBe(false);
  });

  it('canPlayCard - 리드 수트 있으면 리드 수트 필수', () => {
    const hand = [
      { type: 'color' as const, suit: 'green' as const, value: 5 },
      { type: 'color' as const, suit: 'purple' as const, value: 10 },
    ];
    expect(canPlayCard({ type: 'color', suit: 'green', value: 5 }, hand, 'green')).toBe(true);
    expect(canPlayCard({ type: 'color', suit: 'purple', value: 10 }, hand, 'green')).toBe(false);
  });
});
