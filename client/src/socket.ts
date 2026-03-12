import { io } from 'socket.io-client';
import { loadSession } from './storage';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000';

let socket: ReturnType<typeof io> | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function tryReconnect(): boolean {
  const session = loadSession();
  if (!session?.playerId || !session?.roomCode) return false;
  const s = getSocket();
  if (!s.connected) return false;
  s.emit('player:reconnect', {
    roomCode: session.roomCode,
    playerId: session.playerId,
  });
  return true;
}

export function connectAndReconnect(): void {
  const session = loadSession();
  const s = getSocket();
  const doReconnect = () => {
    if (session?.playerId && session?.roomCode) {
      s.emit('player:reconnect', {
        roomCode: session.roomCode,
        playerId: session.playerId,
      });
    }
  };
  s.on('connect', doReconnect);
  if (s.connected) doReconnect();
}
