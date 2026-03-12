import type {
  BetRecord,
  Card,
  Play,
  RoundScore,
  Suit,
  TrickCardsByWinner,
  TrickResult,
} from './types.js';
import { isSuitCard } from './rules.js';

export interface TrickInfo {
  plays: Play[];
  leadSuit: Suit | null;
  result: TrickResult;
}

/** 트릭별 승자에게 모인 카드 수집 (VOID 트릭 제외) */
export function collectTrickCardsByWinner(tricks: TrickInfo[]): TrickCardsByWinner[] {
  const byWinner = new Map<string, Card[]>();
  for (const t of tricks) {
    if (t.result.isVoid || !t.result.winnerId) continue;
    const winnerId = t.result.winnerId;
    const cards = t.plays.map((p) => p.card);
    const existing = byWinner.get(winnerId) ?? [];
    byWinner.set(winnerId, [...existing, ...cards]);
  }
  return Array.from(byWinner.entries()).map(([winnerId, cards]) => ({ winnerId, cards }));
}

/** 라운드 기본 점수 + 보너스 계산 */
export function scoreRound(
  round: number,
  bets: BetRecord[],
  wonCounts: Record<string, number>,
  tricks: TrickInfo[]
): RoundScore[] {
  const trickCardsByWinner = collectTrickCardsByWinner(tricks);
  const successMap = new Map<string, boolean>();
  for (const b of bets) {
    const won = wonCounts[b.playerId] ?? 0;
    successMap.set(b.playerId, b.bet === won);
  }

  const bonuses = calculateBonuses(
    round,
    bets,
    wonCounts,
    trickCardsByWinner,
    tricks,
    successMap
  );

  return bets.map((b) => {
    const won = wonCounts[b.playerId] ?? 0;
    const success = successMap.get(b.playerId)!;
    let base: number;
    if (success) {
      base = b.bet === 0 ? round * 10 : won * 20;
    } else {
      base = b.bet === 0 ? -round * 10 : -Math.abs(b.bet - won) * 10;
    }
    const bonus = success ? (bonuses.get(b.playerId) ?? 0) : 0;
    return {
      playerId: b.playerId,
      baseScore: base,
      bonus,
      total: base + bonus,
    };
  });
}

/** 보너스 계산 (성공자만, 동맹 제외) */
export function calculateBonuses(
  _round: number,
  _bets: BetRecord[],
  _wonCounts: Record<string, number>,
  trickCardsByWinner: TrickCardsByWinner[],
  tricks: TrickInfo[],
  successMap: Map<string, boolean>
): Map<string, number> {
  const bonuses = new Map<string, number>();

  for (const { winnerId, cards } of trickCardsByWinner) {
    if (!successMap.get(winnerId)) continue;
    for (const c of cards) {
      if (isSuitCard(c) && c.value === 14) {
        const add = c.suit === 'black' ? 20 : 10;
        bonuses.set(winnerId, (bonuses.get(winnerId) ?? 0) + add);
      }
    }
  }

  for (const t of tricks) {
    if (t.result.isVoid || !t.result.winnerId) continue;
    const winnerId = t.result.winnerId;
    if (!successMap.get(winnerId)) continue;

    const plays = t.plays;
    const hasMermaid = plays.some((p) => p.card.type === 'special' && p.card.special === 'mermaid');
    const hasPirate = plays.some((p) =>
      p.card.type === 'special' && p.card.special === 'pirate'
    );
    const hasSkullKing = plays.some((p) => p.card.type === 'special' && p.card.special === 'skullking');
    const winnerCard = plays.find((p) => p.playerId === winnerId)?.card;
    if (!winnerCard) continue;

    if (winnerCard.type === 'special' && winnerCard.special === 'pirate' && hasMermaid) {
      const mermaidCount = plays.filter((p) => p.card.type === 'special' && p.card.special === 'mermaid').length;
      bonuses.set(winnerId, (bonuses.get(winnerId) ?? 0) + mermaidCount * 20);
    }
    if (winnerCard.type === 'special' && winnerCard.special === 'skullking' && hasPirate) {
      const pirateCount = plays.filter((p) =>
        p.card.type === 'special' && p.card.special === 'pirate'
      ).length;
      bonuses.set(winnerId, (bonuses.get(winnerId) ?? 0) + pirateCount * 30);
    }
    if (winnerCard.type === 'special' && winnerCard.special === 'mermaid' && hasSkullKing) {
      bonuses.set(winnerId, (bonuses.get(winnerId) ?? 0) + 40);
    }
  }

  return bonuses;
}

