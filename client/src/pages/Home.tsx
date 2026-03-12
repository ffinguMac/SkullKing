import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../socket';
import { saveSession, loadSession } from '../storage';

export default function Home() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(loadSession()?.nickname ?? '');
  const [roomCode, setRoomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = () => {
    if (!nickname.trim()) return;
    setCreating(true);
    const s = getSocket();
    let roomCodeReceived = '';
    s.emit('room:create', { nickname: nickname.trim() });
    s.once('room:update', (state: { roomCode?: string }) => {
      roomCodeReceived = state.roomCode ?? '';
    });
    s.once('hand:update', (h: { playerId: string }) => {
      saveSession({
        playerId: h.playerId,
        roomCode: roomCodeReceived,
        nickname: nickname.trim(),
      });
      navigate('/lobby');
      setCreating(false);
    });
  };

  const handleJoin = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    setJoining(true);
    const s = getSocket();
    const session = loadSession();
    const code = roomCode.trim().toUpperCase();
    s.emit('room:join', {
      roomCode: code,
      nickname: nickname.trim(),
      playerId: session?.playerId,
    });
    s.once('room:update', (state: { roomCode?: string }) => {
      const roomCodeFromServer = state.roomCode ?? code;
      s.once('hand:update', (h: { playerId: string }) => {
        saveSession({
          playerId: h.playerId,
          roomCode: roomCodeFromServer,
          nickname: nickname.trim(),
        });
        setJoining(false);
        navigate('/lobby');
      });
    });
    s.once('game:error', () => setJoining(false));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>스컬킹</h1>
      <div style={{ marginBottom: '1rem' }}>
        <label>닉네임</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임 입력"
          style={{ width: '100%', marginTop: '0.25rem' }}
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={creating}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      >
        {creating ? '생성 중...' : '방 만들기'}
      </button>
      <hr style={{ borderColor: '#4a6a4a', margin: '1rem 0' }} />
      <div style={{ marginBottom: '1rem' }}>
        <label>방 코드</label>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="6자리 코드"
          maxLength={6}
          style={{ width: '100%', marginTop: '0.25rem' }}
        />
      </div>
      <button
        onClick={handleJoin}
        disabled={joining}
        style={{ width: '100%' }}
      >
        {joining ? '참가 중...' : '참가하기'}
      </button>
    </div>
  );
}
