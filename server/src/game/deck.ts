import type { Card, ColorCard, SpecialCard, Suit } from './types.js';

const SUITS: Suit[] = ['green', 'purple', 'yellow', 'black'];

/** 56장 색상 카드 + 14장 특수 + 4장 상급자 */
export function buildDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (let v = 1; v <= 14; v++) {
      deck.push({ type: 'color', suit, value: v } as ColorCard);
    }
  }

  for (let i = 0; i < 5; i++) deck.push({ type: 'special', special: 'pirate' } as SpecialCard);
  for (let i = 0; i < 5; i++) deck.push({ type: 'special', special: 'escape' } as SpecialCard);
  for (let i = 0; i < 2; i++) deck.push({ type: 'special', special: 'mermaid' } as SpecialCard);
  deck.push({ type: 'special', special: 'skullking' } as SpecialCard);
  deck.push({ type: 'special', special: 'kraken' } as SpecialCard);
  deck.push({ type: 'special', special: 'whale' } as SpecialCard);

  return deck;
}

/** seed가 있으면 결정론적 셔플 */
export function shuffle(deck: Card[], seed?: number): Card[] {
  const arr = [...deck];
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** 각 플레이어에게 cardsPerPlayer장씩 나눠줌 (라운드별 tricksPerRound에 맞춤) */
export function deal(deck: Card[], numPlayers: number, cardsPerPlayer: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const total = cardsPerPlayer * numPlayers;
  for (let i = 0; i < total && i < deck.length; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  return hands;
}
