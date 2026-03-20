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
    <div style={{ marginTop: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>My Hand</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
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
                borderRadius: 12,
                overflow: 'hidden',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transform: disabled ? 'none' : 'translateY(0)',
                transition: 'transform 120ms ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled) e.currentTarget.style.transform = 'translateY(-6px)';
              }}
              onMouseLeave={(e) => {
                if (!disabled) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <CardDisplay card={card} size="large" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

