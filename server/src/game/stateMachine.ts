import type { Card, Play, RoundScore, Suit } from './types.js';
import type { TrickInfo } from './scoring.js';
import { buildDeck, shuffle, deal } from './deck.js';
import { updateLeadFromPlay } from './lead.js';
import { canPlayCard } from './rules.js';
import { judgeTrick } from './judge.js';
import { scoreRound } from './scoring.js';

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
  /** 게임 시작 후: 관전자(나갔지만 방 유지) */
  isSpectator?: boolean;
}

export interface GameState {
  phase: GamePhase;
  roundNumber: number;
  /** 시뮬레이터용: shuffle seed */
  devSeed?: number;
  /** 라운드당 트릭 수 (1라운드=1트릭, 2라운드=2트릭...) */
  tricksPerRound: number;
  players: PlayerInfo[];
  /** 게임 중인 플레이어만 (spectator 제외) */
  activePlayerIds: string[];
  hands: Record<string, Card[]>;
  bets: Record<string, number>;
  currentTrickPlays: Play[];
  leadContext: { leadSuit: Suit | null; awaitingFirstColor: boolean };
  tricks: TrickInfo[];
  wonCounts: Record<string, number>;
  roundScores: RoundScore[];
  totalScores: Record<string, number>;
  currentTurnPlayerId: string | null;
  /** 베팅/플레이 순서 */
  turnOrder: string[];
  turnIndex: number;
  stateVersion: number;
}

export type GameAction =
  | { type: 'room:create'; nickname: string }
  | { type: 'room:join'; roomCode: string; nickname: string; playerId?: string }
  | { type: 'room:leave'; roomCode: string; playerId: string }
  | { type: 'room:ready'; roomCode: string; playerId: string }
  | { type: 'game:start'; roomCode: string; playerId: string }
  | { type: 'game:bet'; roomCode: string; playerId: string; value: number }
  | { type: 'game:playCard'; roomCode: string; playerId: string; cardIndex: number }
  | { type: 'player:reconnect'; roomCode: string; playerId: string };

export interface ApplyResult {
  success: boolean;
  error?: string;
  state?: GameState;
}

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const DISCONNECT_GRACE_MS = 60_000;

function createInitialState(): GameState {
  return {
    phase: 'lobby',
    roundNumber: 0,
    tricksPerRound: 0,
    players: [],
    activePlayerIds: [],
    hands: {},
    bets: {},
    currentTrickPlays: [],
    leadContext: { leadSuit: null, awaitingFirstColor: false },
    tricks: [],
    wonCounts: {},
    roundScores: [],
    totalScores: {},
    currentTurnPlayerId: null,
    turnOrder: [],
    turnIndex: 0,
    stateVersion: 0,
  };
}

/** 서버 권위: 모든 입력은 이 함수에서만 처리 */
export function applyAction(
  state: GameState,
  action: GameAction,
  actorId: string
): ApplyResult {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  next.stateVersion = (next.stateVersion ?? 0) + 1;

  switch (action.type) {
    case 'room:create':
      return applyCreate(next, action, actorId);
    case 'room:join':
      return applyJoin(next, action, actorId);
    case 'room:leave':
      return applyLeave(next, action, actorId);
    case 'room:ready':
      return applyReady(next, action, actorId);
    case 'game:start':
      return applyStart(next, action, actorId);
    case 'game:bet':
      return applyBet(next, action, actorId);
    case 'game:playCard':
      return applyPlayCard(next, action, actorId);
    case 'player:reconnect':
      return applyReconnect(next, action, actorId);
    default:
      return { success: false, error: 'UNKNOWN_ACTION' };
  }
}

function applyCreate(state: GameState, _action: { type: 'room:create'; nickname: string }, actorId: string): ApplyResult {
  if (state.players.length > 0) {
    return { success: false, error: 'ROOM_ALREADY_EXISTS' };
  }
  state.players = [{ playerId: actorId, nickname: _action.nickname, ready: false, socketId: null }];
  state.activePlayerIds = [actorId];
  return { success: true, state };
}

function applyJoin(
  state: GameState,
  action: { type: 'room:join'; roomCode: string; nickname: string; playerId?: string },
  actorId: string
): ApplyResult {
  const playerId = action.playerId ?? actorId;
  if (state.phase !== 'lobby') {
    return { success: false, error: 'GAME_ALREADY_STARTED' };
  }
  if (state.players.length >= MAX_PLAYERS) {
    return { success: false, error: 'ROOM_FULL' };
  }
  const exists = state.players.find((p) => p.playerId === playerId);
  if (exists) {
    return { success: true, state };
  }
  state.players.push({ playerId, nickname: action.nickname, ready: false, socketId: null });
  state.activePlayerIds.push(playerId);
  return { success: true, state };
}

function applyLeave(
  state: GameState,
  action: { type: 'room:leave'; roomCode: string; playerId: string },
  actorId: string
): ApplyResult {
  const playerId = action.playerId;
  if (state.phase === 'lobby') {
    state.players = state.players.filter((p) => p.playerId !== playerId);
    state.activePlayerIds = state.activePlayerIds.filter((id) => id !== playerId);
    return { success: true, state };
  }
  const p = state.players.find((x) => x.playerId === playerId);
  if (p) p.isSpectator = true;
  state.activePlayerIds = state.activePlayerIds.filter((id) => id !== playerId);
  return { success: true, state };
}

function applyReady(
  state: GameState,
  action: { type: 'room:ready'; roomCode: string; playerId: string },
  actorId: string
): ApplyResult {
  if (state.phase !== 'lobby') return { success: false, error: 'NOT_IN_LOBBY' };
  const p = state.players.find((x) => x.playerId === action.playerId);
  if (!p) return { success: false, error: 'PLAYER_NOT_FOUND' };
  if (p.playerId !== actorId) return { success: false, error: 'NOT_YOUR_ACTION' };
  p.ready = !p.ready;
  return { success: true, state };
}

function applyStart(
  state: GameState,
  action: { type: 'game:start'; roomCode: string; playerId: string },
  actorId: string
): ApplyResult {
  if (state.phase !== 'lobby') return { success: false, error: 'NOT_IN_LOBBY' };
  const active = state.players.filter((p) => !p.isSpectator && state.activePlayerIds.includes(p.playerId));
  if (active.length < MIN_PLAYERS) return { success: false, error: 'NOT_ENOUGH_PLAYERS' };
  const allReady = active.every((p) => p.ready);
  if (!allReady) return { success: false, error: 'NOT_ALL_READY' };
  if (action.playerId !== actorId) return { success: false, error: 'NOT_YOUR_ACTION' };

  state.phase = 'betting';
  state.roundNumber = 1;
  state.tricksPerRound = 1;
  state.activePlayerIds = active.map((p) => p.playerId);
  state.turnOrder = [...state.activePlayerIds];
  state.turnIndex = 0;
  state.currentTurnPlayerId = state.turnOrder[0];
  state.bets = {};
  state.wonCounts = Object.fromEntries(state.activePlayerIds.map((id) => [id, 0]));
  state.totalScores = Object.fromEntries(state.activePlayerIds.map((id) => [id, 0]));

  const deck = shuffle(buildDeck(), state.devSeed);
  const hands = deal(deck, state.activePlayerIds.length, state.tricksPerRound);
  state.hands = Object.fromEntries(
    state.activePlayerIds.map((id, i) => [id, hands[i]])
  );
  state.currentTrickPlays = [];
  state.leadContext = { leadSuit: null, awaitingFirstColor: false };
  state.tricks = [];
  return { success: true, state };
}

function applyBet(
  state: GameState,
  action: { type: 'game:bet'; roomCode: string; playerId: string; value: number },
  actorId: string
): ApplyResult {
  if (state.phase !== 'betting') return { success: false, error: 'NOT_BETTING' };
  if (action.playerId !== actorId) return { success: false, error: 'NOT_YOUR_ACTION' };
  if (!state.activePlayerIds.includes(actorId)) return { success: false, error: 'NOT_ACTIVE' };
  const { value } = action;
  if (value < 0 || value > state.tricksPerRound) {
    return { success: false, error: 'INVALID_BET' };
  }
  state.bets[actorId] = value;
  state.turnIndex++;
  if (state.turnIndex >= state.turnOrder.length) {
    state.phase = 'playing';
    state.turnIndex = 0;
    state.currentTurnPlayerId = state.turnOrder[0];
  } else {
    state.currentTurnPlayerId = state.turnOrder[state.turnIndex];
  }
  return { success: true, state };
}

function applyPlayCard(
  state: GameState,
  action: { type: 'game:playCard'; roomCode: string; playerId: string; cardIndex: number },
  actorId: string
): ApplyResult {
  if (state.phase !== 'playing') return { success: false, error: 'NOT_PLAYING' };
  if (action.playerId !== actorId) return { success: false, error: 'NOT_YOUR_ACTION' };
  if (state.currentTurnPlayerId !== actorId) return { success: false, error: 'NOT_YOUR_TURN' };
  if (!state.activePlayerIds.includes(actorId)) return { success: false, error: 'NOT_ACTIVE' };

  const hand = state.hands[actorId];
  if (!hand || action.cardIndex < 0 || action.cardIndex >= hand.length) {
    return { success: false, error: 'INVALID_CARD' };
  }

  const card = hand[action.cardIndex];
  if (!canPlayCard(card, hand, state.leadContext.leadSuit)) {
    return { success: false, error: 'MUST_FOLLOW_SUIT' };
  }

  const play: Play = {
    playerId: actorId,
    card,
    playOrder: state.currentTrickPlays.length,
  };

  state.hands[actorId] = hand.filter((_, i) => i !== action.cardIndex);
  state.currentTrickPlays.push(play);
  state.leadContext = updateLeadFromPlay(state.leadContext, play);

  const playOrder = state.turnOrder.indexOf(actorId);
  let nextIndex = (playOrder + 1) % state.turnOrder.length;
  for (let i = 0; i < state.turnOrder.length; i++) {
    const pid = state.turnOrder[nextIndex];
    if (state.activePlayerIds.includes(pid) && state.hands[pid]?.length > 0) {
      state.currentTurnPlayerId = pid;
      break;
    }
    nextIndex = (nextIndex + 1) % state.turnOrder.length;
  }

  if (state.currentTrickPlays.length >= state.activePlayerIds.length) {
    const result = judgeTrick(state.currentTrickPlays, state.leadContext.leadSuit);
    const winnerId = result.winnerId ?? result.wouldHaveWonId ?? result.whalePlayerId;
    state.tricks.push({
      plays: [...state.currentTrickPlays],
      leadSuit: state.leadContext.leadSuit,
      result,
    });
    if (winnerId) state.wonCounts[winnerId] = (state.wonCounts[winnerId] ?? 0) + 1;

    state.currentTrickPlays = [];
    state.leadContext = { leadSuit: null, awaitingFirstColor: false };

    const totalTricksPlayed = state.tricks.length;
    if (totalTricksPlayed >= state.tricksPerRound) {
      state.phase = 'roundEnd';
      state.roundScores = scoreRound(
        state.roundNumber,
        state.activePlayerIds.map((id) => ({ playerId: id, bet: state.bets[id] ?? 0 })),
        state.wonCounts,
        state.tricks
      );
      for (const rs of state.roundScores) {
        state.totalScores[rs.playerId] = (state.totalScores[rs.playerId] ?? 0) + rs.total;
      }
      return { success: true, state };
    }

    if (winnerId) {
      const winnerIdx = state.turnOrder.indexOf(winnerId);
      state.turnIndex = winnerIdx;
      state.currentTurnPlayerId = winnerId;
    }
  }

  return { success: true, state };
}

function applyReconnect(
  state: GameState,
  _action: { type: 'player:reconnect'; roomCode: string; playerId: string },
  actorId: string
): ApplyResult {
  const p = state.players.find((x) => x.playerId === actorId);
  if (!p) return { success: false, error: 'PLAYER_NOT_FOUND' };
  return { success: true, state };
}

/** 라운드 종료 후 다음 라운드 또는 게임 종료 */
export function advanceToNextRound(state: GameState): GameState {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  next.stateVersion++;
  next.roundNumber++;
  if (next.roundNumber > 10) {
    next.phase = 'gameOver';
    return next;
  }
  next.tricksPerRound = next.roundNumber;
  next.phase = 'betting';
  next.tricks = [];
  next.currentTrickPlays = [];
  next.leadContext = { leadSuit: null, awaitingFirstColor: false };
  next.bets = {};
  next.wonCounts = Object.fromEntries(next.activePlayerIds.map((id) => [id, 0]));
  next.turnOrder = [...next.activePlayerIds];
  next.turnIndex = 0;
  next.currentTurnPlayerId = next.turnOrder[0];

  const deck = shuffle(buildDeck(), next.devSeed);
  const hands = deal(deck, next.activePlayerIds.length, next.tricksPerRound);
  next.hands = Object.fromEntries(
    next.activePlayerIds.map((id, i) => [id, hands[i]])
  );
  return next;
}

export { createInitialState, DISCONNECT_GRACE_MS };
