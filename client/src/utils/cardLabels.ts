import type { Card } from '../types';

/** [AmirRezaM75/skullking] Suit names: Parrot, Pirate Map, Treasure Chest, Jolly Roger */
const SUIT_NAMES: Record<string, string> = {
  green: 'Parrot',
  purple: 'Pirate Map',
  yellow: 'Treasure Chest',
  black: 'Jolly Roger',
};

const SPECIAL_NAMES: Record<string, string> = {
  pirate: 'Pirate',
  escape: 'Escape',
  mermaid: 'Mermaid',
  skullking: 'Skull King',
  kraken: 'Kraken',
  whale: 'White Whale',
};

export function getCardLabel(card: Card): string {
  if (card.type === 'color') {
    return `${SUIT_NAMES[card.suit] ?? card.suit} ${card.value}`;
  }
  return SPECIAL_NAMES[card.special] ?? card.special;
}

export function getSuitShortLabel(suit: string): string {
  const short: Record<string, string> = {
    green: '🟢',
    purple: '🟣',
    yellow: '🟡',
    black: '⚫',
  };
  return short[suit] ?? suit[0] ?? '';
}
