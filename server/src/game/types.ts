// 스컬킹 카드/게임 타입 정의

export type Suit = 'green' | 'purple' | 'yellow' | 'black';

export type SpecialType =
  | 'pirate'
  | 'escape'
  | 'mermaid'
  | 'skullking'
  | 'kraken'
  | 'whale';

export interface ColorCard {
  type: 'color';
  suit: Suit;
  value: number; // 1~14
}

export interface SpecialCard {
  type: 'special';
  special: SpecialType;
}

export type Card = ColorCard | SpecialCard;

export interface Play {
  playerId: string;
  card: Card;
  /** 플레이 순서(0부터) */
  playOrder: number;
}

export interface LeadContext {
  /** 현재 리드 수트 (없으면 null) */
  leadSuit: Suit | null;
  /** 탈출계열 리드 후 첫 색상 대기 중인지 */
  awaitingFirstColor: boolean;
}

export interface TrickResult {
  /** 승자 playerId, VOID면 null */
  winnerId: string | null;
  /** VOID 여부 */
  isVoid: boolean;
  /** 크라켄 없었다면 승자 (크라켄 효과 시) */
  wouldHaveWonId?: string;
  /** 흰고래 낸 사람 (흰고래 VOID 시) */
  whalePlayerId?: string;
}

export interface RoundScore {
  playerId: string;
  baseScore: number;
  bonus: number;
  total: number;
}

export interface BetRecord {
  playerId: string;
  bet: number;
}

export interface TrickCardsByWinner {
  winnerId: string;
  cards: Card[];
}
