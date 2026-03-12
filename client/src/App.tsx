import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getSocket, connectAndReconnect } from './socket';
import { loadSession } from './storage';
import { GameStateProvider } from './contexts/GameStateContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function ReconnectRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const session = loadSession();
    if (!session?.roomCode) return;

    const s = getSocket();
    const onRoomUpdate = (state: { phase?: string }) => {
      if (state.phase === 'lobby' && location.pathname !== '/lobby') {
        navigate('/lobby');
      } else if (state.phase && state.phase !== 'lobby' && location.pathname !== '/game') {
        navigate('/game');
      }
    };
    s.on('room:update', onRoomUpdate);
    return () => {
      s.off('room:update', onRoomUpdate);
    };
  }, [navigate, location.pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    connectAndReconnect();
  }, []);

  return (
    <GameStateProvider>
      <ReconnectRedirect />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameStateProvider>
  );
}
