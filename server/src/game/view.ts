import type { Card, Suit } from './types.js';
import type { GameState } from './stateMachine.js';
import { getFollowRequirement } from './lead.js';
import { canPlayCard } from './rules.js';

/** 공개 상태: 손패 제외 */
export function makePublicState(state: GameState): Record<string, unknown> {
  const { hands: _h, ...rest } = state;
  return {
    ...rest,
    hands: undefined,
  };
}

/** 개인 뷰: 손패, playerId, followRequirement, canPlayCardHints */
export function getPrivateView(state: GameState, playerId: string): {
  hand: Card[];
  playerId: string;
  followRequirement: { mustFollowSuit: Suit | null };
  canPlayCardHints: boolean[];
} {
  const hand = state.hands[playerId] ?? [];
  const followReq = getFollowRequirement(state.leadContext, hand);
  const isMyTurn = state.currentTurnPlayerId === playerId && state.phase === 'playing';
  const canPlayCardHints = hand.map((card) =>
    isMyTurn && canPlayCard(card, hand, state.leadContext.leadSuit)
  );
  return {
    hand,
    playerId,
    followRequirement: followReq,
    canPlayCardHints,
  };
}
