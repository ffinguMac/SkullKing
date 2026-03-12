import { describe, it, expect } from 'vitest';
import { updateLeadFromPlay, getFollowRequirement } from '../lead.js';
import { canPlayCard } from '../rules.js';
import type { Card, LeadContext, Play } from '../types.js';

const mkPlay = (playerId: string, card: Card, order: number): Play => ({
  playerId,
  card,
  playOrder: order,
});

describe('리드/팔로우', () => {
  it('색상 카드 리드 → 리드 수트 확정', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'color', suit: 'green', value: 5 }, 0));
    expect(next.leadSuit).toBe('green');
    expect(next.awaitingFirstColor).toBe(false);
  });

  it('탈출 리드 → awaitingFirstColor', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'special', special: 'escape' }, 0));
    expect(next.leadSuit).toBeNull();
    expect(next.awaitingFirstColor).toBe(true);
  });

  it('탈출 후 첫 색상 → 리드 수트 확정', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: true };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'color', suit: 'purple', value: 10 }, 0));
    expect(next.leadSuit).toBe('purple');
    expect(next.awaitingFirstColor).toBe(false);
  });

  it('해적 리드 → 리드 수트 없음', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'special', special: 'pirate' }, 0));
    expect(next.leadSuit).toBeNull();
    expect(next.awaitingFirstColor).toBe(false);
  });

  it('스컬킹 리드 → 리드 수트 없음', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'special', special: 'skullking' }, 0));
    expect(next.leadSuit).toBeNull();
    expect(next.awaitingFirstColor).toBe(false);
  });

  it('크라켄 리드 → 리드 수트 없음', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const next = updateLeadFromPlay(ctx, mkPlay('A', { type: 'special', special: 'kraken' }, 0));
    expect(next.leadSuit).toBeNull();
    expect(next.awaitingFirstColor).toBe(false);
  });

  it('getFollowRequirement - 리드 수트 있으면 mustFollowSuit', () => {
    const ctx: LeadContext = { leadSuit: 'green', awaitingFirstColor: false };
    const hand: Card[] = [
      { type: 'color', suit: 'green', value: 5 },
      { type: 'color', suit: 'purple', value: 10 },
    ];
    expect(getFollowRequirement(ctx, hand).mustFollowSuit).toBe('green');
  });

  it('getFollowRequirement - 리드 수트 없으면 null', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: false };
    const hand: Card[] = [{ type: 'color', suit: 'green', value: 5 }];
    expect(getFollowRequirement(ctx, hand).mustFollowSuit).toBeNull();
  });

  it('getFollowRequirement - 리드 수트 없으면 null (awaitingFirstColor)', () => {
    const ctx: LeadContext = { leadSuit: null, awaitingFirstColor: true };
    const hand: Card[] = [{ type: 'color', suit: 'green', value: 5 }];
    expect(getFollowRequirement(ctx, hand).mustFollowSuit).toBeNull();
  });

  it('getFollowRequirement - 손에 리드 수트 없으면 null', () => {
    const ctx: LeadContext = { leadSuit: 'green', awaitingFirstColor: false };
    const hand: Card[] = [{ type: 'color', suit: 'purple', value: 10 }];
    expect(getFollowRequirement(ctx, hand).mustFollowSuit).toBeNull();
  });

  it('canPlayCard - 리드 수트 있으면 리드 수트 카드만 가능 (손에 있을 때)', () => {
    const hand: Card[] = [
      { type: 'color', suit: 'green', value: 5 },
      { type: 'color', suit: 'purple', value: 10 },
    ];
    expect(canPlayCard({ type: 'color', suit: 'green', value: 5 }, hand, 'green')).toBe(true);
    expect(canPlayCard({ type: 'color', suit: 'purple', value: 10 }, hand, 'green')).toBe(false);
  });

  it('canPlayCard - 특수카드는 언제든 가능', () => {
    const hand: Card[] = [
      { type: 'color', suit: 'green', value: 5 },
      { type: 'special', special: 'pirate' },
    ];
    expect(canPlayCard({ type: 'special', special: 'pirate' }, hand, 'green')).toBe(true);
  });

  it('canPlayCard - 리드 수트 없으면 아무거나', () => {
    const hand: Card[] = [{ type: 'color', suit: 'purple', value: 10 }];
    expect(canPlayCard({ type: 'color', suit: 'purple', value: 10 }, hand, null)).toBe(true);
  });

  it('canPlayCard - 손에 리드 수트 없으면 아무거나', () => {
    const hand: Card[] = [{ type: 'color', suit: 'purple', value: 10 }];
    expect(canPlayCard({ type: 'color', suit: 'purple', value: 10 }, hand, 'green')).toBe(true);
  });
});
