import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import { loadSession, clearSession } from '../storage';
import { useGameState } from '../hooks/useGameState';

export default function Lobby() {
  const navigate = useNavigate();
  const { publicState, error, toast, clearError } = useGameState();
  const session = loadSession();

  useEffect(() => {
    if (!session?.roomCode) {
      navigate('/');
      return;
    }
  }, [session?.roomCode, navigate]);

  useEffect(() => {
    if (publicState?.phase && publicState.phase !== 'lobby') {
      navigate('/game');
    }
  }, [publicState?.phase, navigate]);

  const handleReady = () => {
    if (!session?.roomCode || !session?.playerId) return;
    getSocket().emit('room:ready', {
      roomCode: session.roomCode,
      playerId: session.playerId,
    });
  };

  const handleStart = () => {
    if (!session?.roomCode || !session?.playerId) return;
    getSocket().emit('game:start', {
      roomCode: session.roomCode,
      playerId: session.playerId,
    });
  };

  const handleLeave = () => {
    if (!session?.roomCode || !session?.playerId) return;
    getSocket().emit('room:leave', {
      roomCode: session.roomCode,
      playerId: session.playerId,
    });
    clearSession();
    navigate('/');
  };

  if (!session) return null;

  const players = publicState?.players ?? [];
  const activePlayers = players.filter((p) => !p.isSpectator);
  const allReady = activePlayers.length >= 2 && activePlayers.every((p) => p.ready);
  const isHost = activePlayers[0]?.playerId === session.playerId;
  const me = players.find((p) => p.playerId === session.playerId);

  return (
    <div style={{ padding: '2rem', maxWidth: 500, margin: '0 auto' }}>
      <h1>로비 - {publicState?.roomCode ?? session.roomCode}</h1>
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
      <h2>참가자 ({activePlayers.length}/6)</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activePlayers.map((p) => (
          <li key={p.playerId} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {p.nickname}
            {p.ready && <span style={{ color: '#6a9' }}>✓ 레디</span>}
            {p.playerId === session.playerId && <span style={{ color: '#9a9' }}>(나)</span>}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={handleReady}>
          {me?.ready ? '레디 취소' : '레디'}
        </button>
        {isHost && (
          <button onClick={handleStart} disabled={!allReady}>
            게임 시작
          </button>
        )}
        <button onClick={handleLeave} style={{ marginLeft: 'auto' }}>
          나가기
        </button>
      </div>
    </div>
  );
}
