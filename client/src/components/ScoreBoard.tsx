import type { PlayerInfo } from '../types';

interface ScoreBoardProps {
  players: PlayerInfo[];
  totalScores: Record<string, number>;
  roundScores: { playerId: string; baseScore: number; bonus: number; total: number }[];
  phase: string;
  bets: Record<string, number>;
  currentPlayerId: string;
}

export default function ScoreBoard({
  players,
  totalScores,
  roundScores,
  phase,
  bets,
  currentPlayerId,
}: ScoreBoardProps) {
  const activePlayers = players.filter((p) => !p.isSpectator);
  const showScore = phase !== 'betting' && roundScores.length > 0;

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Scoreboard</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>플레이어</th>
            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>누적</th>
            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #4a6a4a' }}>이번 라운드</th>
          </tr>
        </thead>
        <tbody>
          {activePlayers.map((p) => {
            const total = totalScores[p.playerId] ?? 0;
            const rs = roundScores.find((r) => r.playerId === p.playerId);
            const bet = bets?.[p.playerId];
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
                <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #333' }}>
                  <div style={{ fontWeight: 800, color: bet !== undefined ? '#9fcf9f' : '#8aa', fontSize: '0.9rem' }}>
                    {bet !== undefined ? `베팅 ${bet}` : '베팅 대기'}
                  </div>
                  {showScore && (
                    <div style={{ fontSize: '0.82rem', color: '#cfe', marginTop: 3 }}>
                      {rs ? `${rs.total} (기본 ${rs.baseScore} + 보너스 ${rs.bonus})` : '-'}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
