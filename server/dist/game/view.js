import { getFollowRequirement } from './lead.js';
import { canPlayCard } from './rules.js';
/** 공개 상태: 손패 제외 */
export function makePublicState(state) {
    const { hands: _h, ...rest } = state;
    return {
        ...rest,
        hands: undefined,
    };
}
/** 개인 뷰: 손패, playerId, followRequirement, canPlayCardHints */
export function getPrivateView(state, playerId) {
    const hand = state.hands[playerId] ?? [];
    const followReq = getFollowRequirement(state.leadContext, hand);
    const isMyTurn = state.currentTurnPlayerId === playerId && state.phase === 'playing';
    const canPlayCardHints = hand.map((card) => isMyTurn && canPlayCard(card, hand, state.leadContext.leadSuit));
    return {
        hand,
        playerId,
        followRequirement: followReq,
        canPlayCardHints,
    };
}
