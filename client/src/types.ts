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
  tricks: unknown[];
  wonCounts: Record<string, number>;
  roundScores: { playerId: string; baseScore: number; bonus: number; total: number }[];
  totalScores: Record<string, number>;
  currentTurnPlayerId: string | null;
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
