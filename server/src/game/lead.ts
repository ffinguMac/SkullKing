import type { Card, LeadContext, Play, Suit } from './types.js';
import { isSuitCard, isEscapeLike, isCharacterCard } from './rules.js';

/** 플레이 후 리드 컨텍스트 갱신 */
export function updateLeadFromPlay(
  ctx: LeadContext,
  play: Play
): LeadContext {
  const card = play.card;

  if (isCharacterCard(card)) {
    return { leadSuit: null, awaitingFirstColor: false };
  }

  if (isEscapeLike(card)) {
    return { leadSuit: null, awaitingFirstColor: true };
  }

  if (isSuitCard(card)) {
    if (ctx.awaitingFirstColor) {
      return { leadSuit: card.suit, awaitingFirstColor: false };
    }
    return { leadSuit: card.suit, awaitingFirstColor: false };
  }

  return ctx;
}

/** 팔로우 제약: 리드 수트가 있으면 해당 색상 카드가 있으면 반드시 제출 */
export function getFollowRequirement(
  ctx: LeadContext,
  hand: Card[]
): { mustFollowSuit: Suit | null } {
  if (!ctx.leadSuit) return { mustFollowSuit: null };
  const hasLeadSuit = hand.some((c) => isSuitCard(c) && c.suit === ctx.leadSuit);
  return { mustFollowSuit: hasLeadSuit ? ctx.leadSuit : null };
}
