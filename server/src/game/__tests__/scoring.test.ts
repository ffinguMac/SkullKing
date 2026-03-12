import { describe, it, expect } from 'vitest';
import {
  scoreRound,
  calculateBonuses,
  collectTrickCardsByWinner,
  applyLootAllianceBonuses,
  type TrickInfo,
} from '../scoring.js';
import { judgeTrick } from '../judge.js';
import type { BetRecord, Play } from '../types.js';

const mk = (playerId: string, card: Play['card'], order: number): Play => ({
  playerId,
  card,
  playOrder: order,
});

function buildTrick(plays: Play[], leadSuit: string | null): TrickInfo {
  return {
    plays,
    leadSuit: leadSuit as 'green' | 'purple' | 'yellow' | 'black' | null,
    result: judgeTrick(plays, leadSuit as 'green' | 'purple' | 'yellow' | 'black' | null),
  };
}

describe('점수/보너스', () => {
  it('bet==won 성공: won*20', () => {
    const bets: BetRecord[] = [{ playerId: 'A', bet: 2 }];
    const wonCounts = { A: 2 };
    const tricks: TrickInfo[] = [];
    const scores = scoreRound(1, bets, wonCounts, tricks);
    expect(scores[0].baseScore).toBe(40);
    expect(scores[0].total).toBe(40);
  });

  it('bet=0 성공: round*10', () => {
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }];
    const wonCounts = { A: 0 };
    const tricks: TrickInfo[] = [];
    const scores = scoreRound(3, bets, wonCounts, tricks);
    expect(scores[0].baseScore).toBe(30);
  });

  it('실패: -abs(bet-won)*10', () => {
    const bets: BetRecord[] = [{ playerId: 'A', bet: 2 }];
    const wonCounts = { A: 0 };
    const tricks: TrickInfo[] = [];
    const scores = scoreRound(1, bets, wonCounts, tricks);
    expect(scores[0].baseScore).toBe(-20);
    expect(scores[0].bonus).toBe(0);
  });

  it('bet=0 실패: -round*10', () => {
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }];
    const wonCounts = { A: 1 };
    const tricks: TrickInfo[] = [];
    const scores = scoreRound(2, bets, wonCounts, tricks);
    expect(scores[0].baseScore).toBe(-20);
  });

  it('14 보너스 - 초록/보라/노랑 +10', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'color', suit: 'green', value: 14 }, 0),
          mk('B', { type: 'color', suit: 'green', value: 10 }, 1),
        ],
        'green'
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 1 }, { playerId: 'B', bet: 0 }];
    const wonCounts = { A: 1, B: 0 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const a = scores.find((s) => s.playerId === 'A')!;
    expect(a.bonus).toBe(10);
    expect(a.total).toBe(20 + 10);
  });

  it('14 보너스 - 검정 +20', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'color', suit: 'green', value: 10 }, 0),
          mk('B', { type: 'color', suit: 'black', value: 14 }, 1),
        ],
        'green'
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }, { playerId: 'B', bet: 1 }];
    const wonCounts = { A: 0, B: 1 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const b = scores.find((s) => s.playerId === 'B')!;
    expect(b.bonus).toBe(20);
  });

  it('해적으로 인어 잡기 +20', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'pirate' }, 0),
          mk('B', { type: 'special', special: 'mermaid' }, 1),
        ],
        null
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 1 }, { playerId: 'B', bet: 0 }];
    const wonCounts = { A: 1, B: 0 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const a = scores.find((s) => s.playerId === 'A')!;
    expect(a.bonus).toBe(20);
  });

  it('스컬킹으로 해적 잡기 +30', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'pirate' }, 0),
          mk('B', { type: 'special', special: 'skullking' }, 1),
        ],
        null
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }, { playerId: 'B', bet: 1 }];
    const wonCounts = { A: 0, B: 1 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const b = scores.find((s) => s.playerId === 'B')!;
    expect(b.bonus).toBe(30);
  });

  it('인어로 스컬킹 잡기 +40', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'skullking' }, 0),
          mk('B', { type: 'special', special: 'mermaid' }, 1),
        ],
        null
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }, { playerId: 'B', bet: 1 }];
    const wonCounts = { A: 0, B: 1 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const b = scores.find((s) => s.playerId === 'B')!;
    expect(b.bonus).toBe(40);
  });

  it('실패 시 보너스 0', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'color', suit: 'black', value: 14 }, 0),
          mk('B', { type: 'color', suit: 'green', value: 10 }, 1),
        ],
        'green'
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }, { playerId: 'B', bet: 1 }];
    const wonCounts = { A: 1, B: 0 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const a = scores.find((s) => s.playerId === 'A')!;
    expect(a.bonus).toBe(0);
  });

  it('collectTrickCardsByWinner - VOID 제외', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'kraken' }, 0),
          mk('B', { type: 'color', suit: 'green', value: 10 }, 1),
        ],
        'green'
      ),
    ];
    const collected = collectTrickCardsByWinner(tricks);
    expect(collected.length).toBe(0);
  });

  it('해적 인어 2장 +40', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'pirate' }, 0),
          mk('B', { type: 'special', special: 'mermaid' }, 1),
          mk('C', { type: 'special', special: 'mermaid' }, 2),
        ],
        null
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 1 }, { playerId: 'B', bet: 0 }, { playerId: 'C', bet: 0 }];
    const wonCounts = { A: 1, B: 0, C: 0 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const a = scores.find((s) => s.playerId === 'A')!;
    expect(a.bonus).toBe(40);
  });

  it('스컬킹 해적 2장 +60', () => {
    const tricks: TrickInfo[] = [
      buildTrick(
        [
          mk('A', { type: 'special', special: 'pirate' }, 0),
          mk('B', { type: 'special', special: 'pirate' }, 1),
          mk('C', { type: 'special', special: 'skullking' }, 2),
        ],
        null
      ),
    ];
    const bets: BetRecord[] = [{ playerId: 'A', bet: 0 }, { playerId: 'B', bet: 0 }, { playerId: 'C', bet: 1 }];
    const wonCounts = { A: 0, B: 0, C: 1 };
    const scores = scoreRound(1, bets, wonCounts, tricks);
    const c = scores.find((s) => s.playerId === 'C')!;
    expect(c.bonus).toBe(60);
  });
});
