import type { Card, ColorCard, Suit } from './types.js';

export function normalizeCard(card: Card): Card {
  return JSON.parse(JSON.stringify(card));
}

export function isSuitCard(card: Card): card is ColorCard {
  return card.type === 'color';
}

/** 탈출 카드 (Escape) */
export function isEscapeLike(card: Card): boolean {
  return card.type === 'special' && card.special === 'escape';
}

/** 해적/인어/스컬킹/크라켄/흰고래 */
export function isCharacterCard(card: Card): boolean {
  if (card.type === 'special') {
    if (card.special === 'pirate') return true;
    if (card.special === 'mermaid') return true;
    if (card.special === 'skullking') return true;
    if (card.special === 'kraken') return true;
    if (card.special === 'whale') return true;
  }
  return false;
}

/** 리드 수트가 있을 때, 손에 리드 수트 색상 카드가 있으면 반드시 제출. 특수카드는 언제든 가능 */
export function canPlayCard(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null
): boolean {
  if (!leadSuit) return true;
  if (!isSuitCard(card)) return true; // 특수카드는 언제든 가능

  const hasLeadSuit = hand.some(
    (c) => isSuitCard(c) && c.suit === leadSuit
  );
  if (!hasLeadSuit) return true;
  return card.type === 'color' && card.suit === leadSuit;
}
