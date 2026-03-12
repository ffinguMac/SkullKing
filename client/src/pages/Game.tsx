import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import { loadSession, clearSession } from '../storage';
import { useGameState, type RoundScoreSummary } from '../hooks/useGameState';
import Hand from '../components/Hand';
import TrickArea from '../components/TrickArea';
import ScoreBoard from '../components/ScoreBoard';

export default function Game() {
  const navigate = useNavigate();
  const { publicState, privateView, error, toast, roundResult, clearError, clearRoundResult } = useGameState();
  const session = loadSession();

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

  const isMyTurn = publicState.currentTurnPlayerId === session.playerId;
  const playerId = session.playerId;

  const phaseLabel =
    publicState.phase === 'betting'
      ? '베팅'
      : publicState.phase === 'playing'
        ? '카드 플레이'
        : publicState.phase;

  return (
    <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
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

      {roundResult && roundResult.length > 0 && (
        <RoundResultModal
          roundResult={roundResult}
          players={publicState.players}
          currentPlayerId={playerId}
          onClose={clearRoundResult}
        />
      )}
      {publicState.phase === 'betting' && isMyTurn && (
        <BetInput
          max={publicState.tricksPerRound}
          label={`Bet (0–${publicState.tricksPerRound} tricks)`}
          onSubmit={(v) => {
            getSocket().emit('game:bet', {
              roomCode: session.roomCode,
              playerId,
              value: v,
            });
          }}
        />
      )}

      <TrickArea plays={publicState.currentTrickPlays} players={publicState.players} />
      <ScoreBoard
        players={publicState.players}
        totalScores={publicState.totalScores}
        roundScores={publicState.roundScores}
        currentPlayerId={playerId}
      />
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
      <h2 style={{ fontSize: '1.25rem', color: isWinner ? '#6a9' : '#8a8', marginBottom: '2rem' }}>
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

function BetInput({ max, label, onSubmit }: { max: number; label?: string; onSubmit: (v: number) => void }) {
  const [val, setVal] = useState(0);
  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', background: '#1a2a1a', borderRadius: 8 }}>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>{label ?? `Bet (0–${max})`}</label>
      <input
        type="number"
        min={0}
        max={max}
        value={val}
        onChange={(e) => setVal(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
        style={{ width: 80, marginLeft: '0.5rem' }}
      />
      <button onClick={() => onSubmit(val)} style={{ marginLeft: '0.5rem', padding: '0.25rem 0.75rem' }}>Confirm</button>
    </div>
  );
}

