import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import { loadSession, clearSession } from '../storage';
import { useGameState, type RoundScoreSummary } from '../hooks/useGameState';
import Hand from '../components/Hand';
import TrickArea from '../components/TrickArea';
import ScoreBoard from '../components/ScoreBoard';
import CardDisplay from '../components/CardDisplay';
import type { Card } from '../types';

export default function Game() {
  const navigate = useNavigate();
  const { publicState, privateView, error, toast, roundResult, clearError, clearRoundResult } = useGameState();
  const session = loadSession();
  const [trickNotice, setTrickNotice] = useState<string | null>(null);
  const prevTrickCountRef = useRef(0);

  useEffect(() => {
    if (!session?.roomCode) {
      navigate('/');
      return;
    }
    if (publicState?.phase === 'lobby') {
      navigate('/lobby');
    }
  }, [session?.roomCode, publicState?.phase, navigate]);

  if (!session || !publicState) return null;
  if (publicState.phase === 'lobby') return null;

  if (publicState.phase === 'gameOver') {
    return (
      <GameOverScreen
        players={publicState.players}
        totalScores={publicState.totalScores}
        currentPlayerId={session.playerId}
        onLeave={() => {
          if (session?.roomCode && session?.playerId) {
            getSocket().emit('room:leave', {
              roomCode: session.roomCode,
              playerId: session.playerId,
            });
          }
          clearSession();
          navigate('/');
        }}
      />
    );
  }

  const isMyTurn = publicState.phase === 'playing' && publicState.currentTurnPlayerId === session.playerId;
  const playerId = session.playerId;
  const activePlayersRaw = publicState.players.filter((p) => !p.isSpectator).slice(0, 6);
  const mySeatIndex = activePlayersRaw.findIndex((p) => p.playerId === playerId);
  const activePlayers =
    mySeatIndex >= 0
      ? [
          ...activePlayersRaw.slice(mySeatIndex),
          ...activePlayersRaw.slice(0, mySeatIndex),
        ]
      : activePlayersRaw;
  // "선"은 현재 트릭의 첫 플레이어(= 현재 턴 플레이어)로 표시
  const leadPlayerId = publicState.phase === 'playing' ? (publicState.currentTrickLeadPlayerId ?? null) : null;
  const leadPlayerName = leadPlayerId
    ? publicState.players.find((p) => p.playerId === leadPlayerId)?.nickname ?? leadPlayerId.slice(0, 8)
    : '-';
  const currentTurnName =
    publicState.phase === 'playing' && publicState.currentTurnPlayerId
      ? publicState.players.find((p) => p.playerId === publicState.currentTurnPlayerId)?.nickname ??
        publicState.currentTurnPlayerId.slice(0, 8)
      : '-';

  const canBet = publicState.phase === 'betting' && publicState.activePlayerIds.includes(session.playerId);
  const myBet = publicState.phase === 'betting' ? publicState.bets?.[session.playerId] : undefined;
  const hasBet = typeof myBet === 'number';
  const shouldShowBetModal = publicState.phase === 'betting' && canBet && !hasBet;

  const myTotalScore = publicState.totalScores?.[session.playerId] ?? 0;
  const myTurnIdx = publicState.phase === 'betting' ? publicState.turnOrder.indexOf(session.playerId) : -1;
  const myTurnNumber = myTurnIdx >= 0 ? myTurnIdx + 1 : null;

  useEffect(() => {
    const trickCount = publicState.tricks.length;
    if (trickCount > prevTrickCountRef.current) {
      const lastTrick = publicState.tricks[trickCount - 1];
      const winnerId =
        lastTrick?.result.winnerId ?? lastTrick?.result.wouldHaveWonId ?? lastTrick?.result.whalePlayerId ?? null;
      const winnerName = winnerId
        ? publicState.players.find((p) => p.playerId === winnerId)?.nickname ?? winnerId.slice(0, 8)
        : null;

      setTrickNotice(winnerName ? `🃏 트릭 승리: ${winnerName}` : '🌀 이번 트릭은 VOID');
      const timer = setTimeout(() => setTrickNotice(null), 1800);
      prevTrickCountRef.current = trickCount;
      return () => clearTimeout(timer);
    }
    prevTrickCountRef.current = trickCount;
  }, [publicState.tricks, publicState.players]);

  // 라운드 결과 팝업이 남아있으면 베팅 팝업이 가려지므로,
  // 다음 단계(베팅)로 넘어오면 자동으로 닫는다.
  useEffect(() => {
    if (publicState.phase === 'betting') clearRoundResult();
  }, [publicState.phase, clearRoundResult]);

  const phaseLabel =
    publicState.phase === 'betting'
      ? '베팅'
      : publicState.phase === 'playing'
        ? '카드 플레이'
        : publicState.phase;

  return (
    <div style={{ padding: '1rem', maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>스컬킹 - Round {publicState.roundNumber}</h1>
        <span
          style={{
            padding: '0.25rem 0.75rem',
            background: publicState.phase === 'betting' ? '#3a4a3a' : '#3a3a4a',
            borderRadius: 6,
            fontSize: '0.9rem',
          }}
        >
          {phaseLabel}
          {isMyTurn && <strong style={{ marginLeft: '0.5rem', color: '#9f9' }}>• 내 턴</strong>}
        </span>
      </div>
      {publicState.phase === 'playing' && (
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap',
            marginBottom: '0.9rem',
          }}
        >
          <div
            style={{
              padding: '0.45rem 0.7rem',
              borderRadius: 999,
              background: 'rgba(36, 66, 36, 0.85)',
              border: '1px solid #5c8f5c',
              fontSize: '0.86rem',
            }}
          >
            🎯 선 플레이어: <strong style={{ color: '#b8e7b8' }}>{leadPlayerName}</strong>
          </div>
          <div
            style={{
              padding: '0.45rem 0.7rem',
              borderRadius: 999,
              background: 'rgba(30, 40, 66, 0.85)',
              border: '1px solid #5f7cb2',
              fontSize: '0.86rem',
            }}
          >
            ⏱ 현재 진행: <strong style={{ color: '#c7d6ff' }}>{currentTurnName}</strong>
          </div>
        </div>
      )}
      {publicState.phase === 'betting' && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            borderRadius: 12,
            background: 'rgba(20, 42, 28, 0.7)',
            border: '1px solid rgba(120, 220, 140, 0.35)',
            marginBottom: '0.9rem',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          베팅 단계: 모두가 동시에 베팅할 수 있어요
        </div>
      )}
      {error && (
        <div style={{ padding: '0.5rem', background: '#5a2020', borderRadius: 6, marginBottom: '1rem' }}>
          {error}
          <button onClick={clearError} style={{ marginLeft: '0.5rem' }}>닫기</button>
        </div>
      )}
      {toast && (
        <div style={{ padding: '0.5rem', background: '#2a4a2a', borderRadius: 6, marginBottom: '1rem' }}>
          {toast}
        </div>
      )}
      {trickNotice && (
        <div
          className="trick-notice"
          style={{
            padding: '0.65rem 0.9rem',
            background: 'linear-gradient(90deg, rgba(24,68,42,0.95), rgba(38,92,56,0.95), rgba(24,68,42,0.95))',
            border: '1px solid #9ad69a',
            borderRadius: 8,
            marginBottom: '0.9rem',
            fontWeight: 700,
            letterSpacing: '0.01em',
            textAlign: 'center',
            boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
          }}
        >
          {trickNotice}
        </div>
      )}

      {roundResult && roundResult.length > 0 && publicState.phase !== 'betting' && (
        <RoundResultModal
          roundResult={roundResult}
          players={publicState.players}
          currentPlayerId={playerId}
          onClose={clearRoundResult}
        />
      )}
      {shouldShowBetModal && (
        <BetModal
          max={publicState.tricksPerRound}
          min={0}
          hand={privateView?.hand ?? []}
          totalScore={myTotalScore}
          turnNumber={myTurnNumber}
          onSubmit={(v) => {
            getSocket().emit('game:bet', {
              roomCode: session.roomCode,
              playerId,
              value: v,
            });
          }}
        />
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 560px', minWidth: 360 }}>
          <div
            style={{
              position: 'relative',
              height: 420,
              marginBottom: 0,
              borderRadius: 16,
              background: 'radial-gradient(circle at center, #204320 0%, #163616 55%, #102a10 100%)',
              border: '1px solid #335833',
              overflow: 'hidden',
            }}
          >
            {activePlayers.map((p, i) => {
              // 내 자리를 항상 하단(남쪽)에 고정하고 나머지는 시계 방향으로 배치
              const angle = (Math.PI * 2 * i) / Math.max(activePlayers.length, 1) + Math.PI / 2;
              const radius = 155;
              const cx = 50 + (Math.cos(angle) * radius * 100) / 540;
              const cy = 50 + (Math.sin(angle) * radius * 100) / 210;
              const isMe = p.playerId === playerId;
              const isTurn = p.playerId === publicState.currentTurnPlayerId;
              const isLead = p.playerId === leadPlayerId;
              const played = publicState.currentTrickPlays.some((play) => play.playerId === p.playerId);
              const betValue = publicState.phase === 'betting' ? publicState.bets?.[p.playerId] : undefined;
              return (
                <div
                  key={p.playerId}
                  style={{
                    position: 'absolute',
                    left: `${cx}%`,
                    top: `${cy}%`,
                    transform: 'translate(-50%, -50%)',
                    minWidth: 110,
                    textAlign: 'center',
                    padding: '0.45rem 0.6rem',
                    borderRadius: 12,
                    background: isMe ? 'rgba(90, 140, 90, 0.35)' : 'rgba(20, 35, 20, 0.75)',
                    border: isTurn ? '1px solid #9f9' : '1px solid #385838',
                    boxShadow: isTurn ? '0 0 12px rgba(130,220,130,0.45)' : undefined,
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    {p.nickname}
                    {isMe ? ' (나)' : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 2, marginBottom: 3 }}>
                    {publicState.phase === 'playing' && isLead && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: 999,
                          background: 'rgba(95, 167, 95, 0.3)',
                          border: '1px solid #7fc27f',
                          color: '#bef0be',
                        }}
                      >
                        선
                      </span>
                    )}
                    {publicState.phase === 'playing' && isTurn && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '1px 5px',
                          borderRadius: 999,
                          background: 'rgba(120, 130, 210, 0.25)',
                          border: '1px solid #8ea2ff',
                          color: '#d0dcff',
                        }}
                      >
                        턴
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color:
                        publicState.phase === 'betting'
                          ? betValue !== undefined
                            ? '#9fcf9f'
                            : '#8aa'
                          : played
                            ? '#9fcf9f'
                            : '#8aa',
                    }}
                  >
                    {publicState.phase === 'betting'
                      ? betValue !== undefined
                        ? `베팅: ${betValue}`
                        : '베팅 대기'
                      : played
                        ? '카드 냄'
                        : isTurn
                          ? '턴 진행중'
                          : '대기중'}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 'min(400px, 78%)',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TrickArea plays={publicState.currentTrickPlays} players={publicState.players} compact />
            </div>
          </div>
        </div>
        <div style={{ width: 340, minWidth: 280 }}>
          <ScoreBoard
            players={publicState.players}
            totalScores={publicState.totalScores}
            roundScores={publicState.roundScores}
            phase={publicState.phase}
            bets={publicState.bets}
            currentPlayerId={playerId}
          />
        </div>
      </div>
      {publicState.phase === 'playing' && (
        <Hand
          hand={privateView?.hand ?? []}
          canPlayHints={privateView?.canPlayCardHints ?? []}
          onPlayCard={(idx) => {
            getSocket().emit('game:playCard', {
              roomCode: session.roomCode,
              playerId,
              cardId: idx,
            });
          }}
          isMyTurn={isMyTurn}
          phase={publicState.phase}
        />
      )}
    </div>
  );
}

function GameOverScreen({
  players,
  totalScores,
  currentPlayerId,
  onLeave,
}: {
  players: { playerId: string; nickname: string; isSpectator?: boolean }[];
  totalScores: Record<string, number>;
  currentPlayerId: string;
  onLeave: () => void;
}) {
  const activePlayers = players.filter((p) => !p.isSpectator);
  const ranked = [...activePlayers].sort(
    (a, b) => (totalScores[b.playerId] ?? 0) - (totalScores[a.playerId] ?? 0)
  );
  const winner = ranked[0];
  const isWinner = winner?.playerId === currentPlayerId;

  return (
    <div style={{ padding: '2rem', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>게임 종료</h1>
      <h2
        style={{
          fontSize: '1.25rem',
          color: isWinner ? '#6a9' : '#8a8',
          marginBottom: '2rem',
        }}
      >
        {isWinner ? '🎉 승리!' : `🏆 승자: ${winner?.nickname ?? '-'}`}
      </h2>
      <div
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>최종 순위</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>
                순위
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>
                플레이어
              </th>
              <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>
                총점
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => {
              const score = totalScores[p.playerId] ?? 0;
              const isMe = p.playerId === currentPlayerId;
              const rankLabel = i === 0 ? '🥇 1등' : i === 1 ? '🥈 2등' : i === 2 ? '🥉 3등' : `${i + 1}등`;
              return (
                <tr
                  key={p.playerId}
                  style={{
                    background: isMe ? 'rgba(100,150,100,0.25)' : undefined,
                  }}
                >
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #333' }}>{rankLabel}</td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #333' }}>
                    {p.nickname}
                    {isMe && ' (나)'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid #333' }}>
                    {score}점
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        onClick={onLeave}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          background: '#4a6a4a',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        나가기
      </button>
    </div>
  );
}

function RoundResultModal({
  roundResult,
  players,
  currentPlayerId,
  onClose,
}: {
  roundResult: RoundScoreSummary[];
  players: { playerId: string; nickname: string }[];
  currentPlayerId: string;
  onClose: () => void;
}) {
  const getNickname = (pid: string) => players.find((p) => p.playerId === pid)?.nickname ?? pid.slice(0, 8);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a2a1a',
          padding: '1.5rem',
          borderRadius: 12,
          minWidth: 280,
          border: '1px solid #4a6a4a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1rem', textAlign: 'center' }}>라운드 결과</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>플레이어</th>
              <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>점수</th>
            </tr>
          </thead>
          <tbody>
            {roundResult.map((r) => {
              const isMe = r.playerId === currentPlayerId;
              return (
                <tr key={r.playerId} style={{ background: isMe ? 'rgba(100,150,100,0.2)' : undefined }}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
                    {getNickname(r.playerId)}
                    {isMe && ' (나)'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #333' }}>
                    {r.total} {r.bonus > 0 && `(+${r.bonus})`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#4a6a4a',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

function BetInput({
  max,
  min = 0,
  label,
  onSubmit,
}: {
  max: number;
  min?: number;
  label?: string;
  onSubmit: (v: number) => void;
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal((prev) => Math.max(min, Math.min(max, prev)));
  }, [min, max]);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const commit = () => onSubmit(clamp(val));

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        background: 'linear-gradient(180deg, #1a2a1a 0%, #172317 100%)',
        borderRadius: 12,
        border: '1px solid #3d5d3d',
      }}
    >
      <div style={{ marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.95rem' }}>
        {label ?? `Bet (${min}–${max})`}
      </div>
      <div style={{ textAlign: 'center', marginBottom: '0.65rem' }}>
        <div
          style={{
            display: 'inline-flex',
            minWidth: 80,
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '0.02em',
            padding: '0.35rem 0.6rem',
            borderRadius: 10,
            background: '#102010',
            border: '1px solid #3f6a3f',
          }}
        >
          {clamp(val)}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
        {Array.from({ length: max - min + 1 }, (_, idx) => min + idx).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setVal(n)}
            style={{
              padding: '0.25rem 0.55rem',
              fontSize: '0.86rem',
              borderRadius: 999,
              background: val === n ? '#4c7b4c' : '#274027',
              border: val === n ? '1px solid #9fd39f' : '1px solid #3f5f3f',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={commit}
        style={{
          width: '100%',
          padding: '0.6rem 0.8rem',
          fontWeight: 900,
          fontSize: '0.95rem',
          borderRadius: 10,
          background: 'linear-gradient(180deg, #4a7a4a 0%, #3d643d 100%)',
          border: '1px solid rgba(160, 220, 160, 0.45)',
        }}
      >
        확정
      </button>
    </div>
  );
}

function BetModal({
  max,
  min = 0,
  hand,
  totalScore,
  turnNumber,
  onSubmit,
}: {
  max: number;
  min?: number;
  hand: Card[];
  totalScore: number;
  turnNumber: number | null;
  onSubmit: (v: number) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          borderRadius: 14,
          background: '#122412',
          border: '1px solid rgba(120, 220, 140, 0.35)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '0.95rem 1rem', borderBottom: '1px solid rgba(80,140,90,0.35)' }}>
          <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>베팅</div>
          <div style={{ color: '#cfe', fontSize: '0.9rem' }}>칩을 고른 뒤 “확정”을 누르세요</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                border: '1px solid rgba(120,220,140,0.25)',
                background: 'rgba(120,220,140,0.08)',
                color: '#d6f5d6',
                fontWeight: 900,
                fontSize: '0.82rem',
              }}
            >
              누적 점수 {totalScore}점
            </span>
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 999,
                border: '1px solid rgba(120,220,140,0.25)',
                background: 'rgba(120,220,140,0.08)',
                color: '#d6f5d6',
                fontWeight: 900,
                fontSize: '0.82rem',
              }}
            >
              차례 {turnNumber ? `${turnNumber}번째` : '-'}
            </span>
          </div>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 800, marginBottom: '0.4rem' }}>내 손패</div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'center',
                maxHeight: 150,
                overflow: 'auto',
                padding: '0.35rem 0.1rem',
                background: 'rgba(0,0,0,0.18)',
                border: '1px solid rgba(80,140,90,0.25)',
                borderRadius: 12,
              }}
            >
              {hand.map((card, idx) => (
                <div key={idx} style={{ flex: '0 0 auto' }}>
                  <CardDisplay card={card} size="normal" />
                </div>
              ))}
            </div>
          </div>
          <BetInput
            max={max}
            min={min}
            label={`Bet (${min}–${max} tricks)`}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}

