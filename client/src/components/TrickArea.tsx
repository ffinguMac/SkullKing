import type { Play } from '../types';
import type { PlayerInfo } from '../types';
import CardDisplay from './CardDisplay';

interface TrickAreaProps {
  plays: Play[];
  players: PlayerInfo[];
  compact?: boolean;
}

export default function TrickArea({ plays, players, compact = false }: TrickAreaProps) {
  const getNickname = (playerId: string) =>
    players.find((p) => p.playerId === playerId)?.nickname ?? playerId.slice(0, 8);

  if (plays.length === 0) {
    return (
      <div
        style={{
          minHeight: compact ? 120 : 100,
          padding: '1rem',
          background: '#1a2a1a',
          borderRadius: 8,
          marginBottom: compact ? 0 : '1rem',
          border: compact ? '1px solid #345' : undefined,
        }}
      >
        <p style={{ color: '#6a8', margin: 0, fontSize: '0.9rem' }}>Current Trick</p>
        <p style={{ color: '#555', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>No cards played yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '1rem',
        background: '#1a2a1a',
        borderRadius: 8,
        marginBottom: compact ? 0 : '1rem',
        border: compact ? '1px solid #345' : undefined,
      }}
    >
      <p style={{ color: '#6a8', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Current Trick</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: compact ? 'center' : 'flex-start' }}>
        {plays.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 8,
              background: '#2a3a2a',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#8a9', marginBottom: 4 }}>
              {getNickname(p.playerId)}
            </span>
            <CardDisplay card={p.card} size="small" />
          </div>
        ))}
      </div>
    </div>
  );
}

