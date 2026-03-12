const KEY = 'skullking';

export interface StoredSession {
  playerId: string;
  roomCode: string;
  nickname: string;
}

export function loadSession(): StoredSession | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const data = JSON.parse(s) as StoredSession;
    if (data.playerId && data.roomCode && data.nickname) return data;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}
