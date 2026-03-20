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
  value: number;
}

export interface SpecialCard {
  type: 'special';
  special: SpecialType;
}

export type Card = ColorCard | SpecialCard;

export interface Play {
  playerId: string;
  card: Card;
  playOrder: number;
}

export interface TrickResultPublic {
  winnerId: string | null;
  isVoid: boolean;
  wouldHaveWonId?: string;
  whalePlayerId?: string;
}

export interface TrickPublic {
  plays: Play[];
  leadSuit: Suit | null;
  result: TrickResultPublic;
}

export type GamePhase =
  | 'lobby'
  | 'betting'
  | 'playing'
  | 'trickEnd'
  | 'roundEnd'
  | 'gameOver';

export interface PlayerInfo {
  playerId: string;
  nickname: string;
  ready: boolean;
  socketId: string | null;
  isSpectator?: boolean;
}

export interface PublicState {
  phase: GamePhase;
  roundNumber: number;
  tricksPerRound: number;
  players: PlayerInfo[];
  activePlayerIds: string[];
  bets: Record<string, number>;
  currentTrickPlays: Play[];
  leadContext: { leadSuit: Suit | null; awaitingFirstColor: boolean };
  tricks: TrickPublic[];
  wonCounts: Record<string, number>;
  roundScores: { playerId: string; baseScore: number; bonus: number; total: number }[];
  totalScores: Record<string, number>;
  currentTurnPlayerId: string | null;
  /** 현재 트릭의 선 플레이어(첫 카드를 낸 플레이어). 트릭 동안 고정 */
  currentTrickLeadPlayerId: string | null;
  turnOrder: string[];
  turnIndex: number;
  stateVersion: number;
  roomCode?: string;
}

export interface PrivateView {
  hand: Card[];
  playerId: string;
  followRequirement: { mustFollowSuit: Suit | null };
  canPlayCardHints: boolean[];
}
