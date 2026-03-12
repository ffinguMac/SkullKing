/**
 * 시뮬레이터: seed 고정, 2라운드 자동 진행
 * 실행: npx tsx src/dev/simulate.ts
 */
import {
  createInitialState,
  applyAction,
  advanceToNextRound,
  type GameState,
} from '../game/stateMachine.js';
import { canPlayCard } from '../game/rules.js';
import { makePublicState } from '../game/view.js';

const SEED = 12345;
const NUM_PLAYERS = 3;
const TARGET_ROUNDS = parseInt(process.env.SIM_ROUNDS ?? '2', 10);

function runSimulation(): void {
  const playerIds = Array.from({ length: NUM_PLAYERS }, (_, i) => `bot-${i}`);
  const nicknames = playerIds.map((_, i) => `Bot${i + 1}`);

  let state = createInitialState() as GameState & { devSeed?: number };
  state.devSeed = SEED;

  let r = applyAction(state, { type: 'room:create', nickname: nicknames[0] }, playerIds[0]);
  if (!r.state) throw new Error('Create failed');
  state = r.state as GameState & { devSeed?: number };

  for (let i = 1; i < NUM_PLAYERS; i++) {
    r = applyAction(state, { type: 'room:join', roomCode: 'X', nickname: nicknames[i], playerId: playerIds[i] }, playerIds[i]);
    if (!r.state) throw new Error(`Join failed: ${r.error}`);
    state = r.state as GameState & { devSeed?: number };
  }

  for (const pid of playerIds) {
    const r = applyAction(state, { type: 'room:ready', roomCode: 'X', playerId: pid }, pid);
    if (r.state) state = r.state as GameState & { devSeed?: number };
  }

  const startR = applyAction(state, { type: 'game:start', roomCode: 'X', playerId: playerIds[0] }, playerIds[0]);
  if (!startR.state) throw new Error('Start failed');
  state = startR.state as GameState & { devSeed?: number };

  logPhase('game:start', state);

  let roundCount = 0;
  while (roundCount < TARGET_ROUNDS && state.phase !== 'gameOver') {
    if (state.phase === 'betting') {
      for (const pid of state.turnOrder) {
        const bet = Math.min(state.tricksPerRound, Math.floor(state.tricksPerRound / 2));
        const r = applyAction(state, { type: 'game:bet', roomCode: 'X', playerId: pid, value: bet }, pid);
        if (!r.state) throw new Error('Bet failed');
        state = r.state as GameState & { devSeed?: number };
      }
      logPhase('betting done', state);
    }

    if (state.phase === 'playing') {
      while (state.phase === 'playing' && state.currentTurnPlayerId) {
        const pid = state.currentTurnPlayerId;
        const hand = state.hands[pid];
        if (!hand || hand.length === 0) break;

        let cardIndex = -1;
        for (let i = 0; i < hand.length; i++) {
          if (canPlayCard(hand[i], hand, state.leadContext.leadSuit)) {
            cardIndex = i;
            break;
          }
        }
        if (cardIndex < 0) throw new Error(`No legal card for ${pid}`);

        const r = applyAction(state, {
          type: 'game:playCard',
          roomCode: 'X',
          playerId: pid,
          cardIndex,
        }, pid);
        if (!r.state) throw new Error(`Play failed: ${r.error}`);
        state = r.state as GameState & { devSeed?: number };
      }

      if (state.phase === 'roundEnd') {
        logPhase('roundEnd', state);
        validateScores(state);
        state = advanceToNextRound(state) as GameState & { devSeed?: number };
        state.devSeed = (state as GameState & { devSeed?: number }).devSeed ?? SEED;
        roundCount++;
        logPhase(`advance round ${roundCount}`, state);
      }
    }
  }

  logPhase('simulation done', state);
  validateScores(state);
  console.log(`✓ 시뮬레이션 ${TARGET_ROUNDS}라운드 완료`);
}

function logPhase(label: string, state: GameState): void {
  console.log(`[${label}] phase=${state.phase} round=${state.roundNumber} turn=${state.currentTurnPlayerId ?? '-'}`);
}

function validateScores(state: GameState): void {
  for (const [pid, score] of Object.entries(state.totalScores ?? {})) {
    if (typeof score !== 'number' || Number.isNaN(score)) {
      throw new Error(`Invalid score for ${pid}: ${score}`);
    }
  }
  for (const rs of state.roundScores ?? []) {
    if (Number.isNaN(rs.total) || Number.isNaN(rs.baseScore) || Number.isNaN(rs.bonus)) {
      throw new Error(`Invalid roundScore: ${JSON.stringify(rs)}`);
    }
  }
  console.log('  점수 검증 OK');
}

function assertNoHandsInPublicState(): void {
  const st = createInitialState();
  st.hands = { p1: [{ type: 'color', suit: 'green', value: 1 }] };
  const publicState = makePublicState(st) as Record<string, unknown>;
  const handsVal = publicState.hands;
  if (handsVal !== undefined && handsVal !== null && typeof handsVal === 'object' && Object.keys(handsVal as object).length > 0) {
    throw new Error('publicState must not expose hands data');
  }
  console.log('✓ publicState 손패 노출 없음 검증 OK');
}

assertNoHandsInPublicState();
runSimulation();
