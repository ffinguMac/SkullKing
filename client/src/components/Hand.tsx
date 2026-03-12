import type { Card } from '../types';
import CardDisplay from './CardDisplay';

interface HandProps {
  hand: Card[];
  canPlayHints: boolean[];
  onPlayCard: (index: number) => void;
  isMyTurn: boolean;
  phase: string;
}

export default function Hand({ hand, canPlayHints, onPlayCard, isMyTurn, phase }: HandProps) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>My Hand</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {hand.map((card, i) => {
          const canPlay = canPlayHints[i] ?? false;
          const disabled = phase !== 'playing' || !isMyTurn || !canPlay;
          return (
            <button
              key={i}
              onClick={() => {
                if (phase !== 'playing' || !isMyTurn || !canPlay) return;
                onPlayCard(i);
              }}
              disabled={disabled}
              style={{
                padding: 0,
                border: 'none',
                borderRadius: 8,
                overflow: 'hidden',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transform: disabled ? 'none' : 'scale(1)',
              }}
            >
              <CardDisplay card={card} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

