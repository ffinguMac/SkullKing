import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSocket } from '../socket';
import type { PublicState } from '../types';
import type { PrivateView } from '../types';

export interface RoundScoreSummary {
  playerId: string;
  baseScore: number;
  bonus: number;
  total: number;
}

interface GameStateContextValue {
  publicState: PublicState | null;
  privateView: PrivateView | null;
  error: string | null;
  toast: string | null;
  roundResult: RoundScoreSummary[] | null;
  clearError: () => void;
  clearRoundResult: () => void;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [privateView, setPrivateView] = useState<PrivateView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundScoreSummary[] | null>(null);

  useEffect(() => {
    const s = getSocket();
    s.on('room:update', (state: PublicState) => {
      setPublicState(state);
      if (state.phase === 'gameOver') setRoundResult(null);
    });
    s.on('hand:update', (view: PrivateView) => setPrivateView(view));
    s.on('game:error', (e: { code: string; message: string }) => setError(e.message));
    s.on('game:toast', (t: { message: string }) => setToast(t.message));
    s.on('game:roundResult', (data: { roundSummary: RoundScoreSummary[] }) => {
      setRoundResult(data.roundSummary ?? null);
    });
    return () => {
      s.off('room:update');
      s.off('hand:update');
      s.off('game:error');
      s.off('game:toast');
      s.off('game:roundResult');
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const clearError = useCallback(() => setError(null), []);
  const clearRoundResult = useCallback(() => setRoundResult(null), []);

  return (
    <GameStateContext.Provider
      value={{ publicState, privateView, error, toast, roundResult, clearError, clearRoundResult }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
