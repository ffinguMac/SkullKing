import type { PlayerInfo } from '../types';

interface ScoreBoardProps {
  players: PlayerInfo[];
  totalScores: Record<string, number>;
  roundScores: { playerId: string; baseScore: number; bonus: number; total: number }[];
  currentPlayerId: string;
}

export default function ScoreBoard({
  players,
  totalScores,
  roundScores,
  currentPlayerId,
}: ScoreBoardProps) {
  const activePlayers = players.filter((p) => !p.isSpectator);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Scoreboard</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>플레이어</th>
            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>누적</th>
            {roundScores.length > 0 && (
              <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>
                이번 라운드
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {activePlayers.map((p) => {
            const total = totalScores[p.playerId] ?? 0;
            const rs = roundScores.find((r) => r.playerId === p.playerId);
            const isMe = p.playerId === currentPlayerId;
            return (
              <tr
                key={p.playerId}
                style={{
                  background: isMe ? 'rgba(100,150,100,0.2)' : undefined,
                }}
              >
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
                  {p.nickname}
                  {isMe && ' (나)'}
                </td>
                <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #333' }}>
                  {total}
                </td>
                {roundScores.length > 0 && (
                  <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #333' }}>
                    {rs ? `${rs.total} (기본 ${rs.baseScore} + 보너스 ${rs.bonus})` : '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
