import type { GameState } from '../game/stateMachine.js';
import {
  applyAction,
  advanceToNextRound,
  createInitialState,
  type GameAction,
} from '../game/stateMachine.js';
import { makePublicState, getPrivateView } from '../game/view.js';
import type { Server } from 'socket.io';
import { persistGameOver, persistGameStart, persistRoundEnd } from '../persistence/supabaseGameStore.js';

const DISCONNECT_GRACE_MS = 60_000;

export interface Room {
  roomCode: string;
  state: GameState;
  playerToSocket: Map<string, string>;
  socketToPlayer: Map<string, string>;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  roundAdvanceTimer: NodeJS.Timeout | null;
  dbGameId: number | null;
  dbPlayerIds: Map<string, number>;
  persistedRoundNumbers: Set<number>;
  gameOverPersisted: boolean;
  lock: Promise<void>;
  lockResolve: (() => void) | null;
}

const rooms = new Map<string, Room>();
const ROUND_TRANSITION_DELAY_MS = 2400;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function acquireLock(room: Room): Promise<() => void> {
  const prev = room.lock;
  let resolve: () => void;
  room.lock = new Promise((r) => { resolve = r; });
  room.lockResolve = resolve!;
  return prev.then(() => () => {
    room.lockResolve?.();
  });
}

export async function withRoomLock<T>(roomCode: string, fn: (room: Room) => Promise<T>): Promise<T | null> {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const release = await acquireLock(room);
  try {
    return await fn(room);
  } finally {
    release();
  }
}

export function createRoom(nickname: string, playerId: string, socketId: string): { roomCode: string; state: GameState } {
  const roomCode = generateRoomCode();
  const state = createInitialState();
  const result = applyAction(state, { type: 'room:create', nickname }, playerId);
  if (!result.success || !result.state) throw new Error(result.error ?? 'CREATE_FAILED');

  const room: Room = {
    roomCode,
    state: result.state,
    playerToSocket: new Map([[playerId, socketId]]),
    socketToPlayer: new Map([[socketId, playerId]]),
    disconnectTimers: new Map(),
    roundAdvanceTimer: null,
    dbGameId: null,
    dbPlayerIds: new Map(),
    persistedRoundNumbers: new Set(),
    gameOverPersisted: false,
    lock: Promise.resolve(),
    lockResolve: null,
  };
  rooms.set(roomCode, room);
  return { roomCode, state: result.state };
}

export async function joinRoom(
  roomCode: string,
  nickname: string,
  playerId: string,
  socketId: string
): Promise<{ success: boolean; error?: string; state?: GameState }> {
  const result = await withRoomLock(roomCode, async (room) => {
    const r = applyAction(room.state, { type: 'room:join', roomCode, nickname, playerId }, playerId);
    if (!r.success) return { success: false, error: r.error };
    room.state = r.state!;
    const oldSocketId = room.playerToSocket.get(playerId);
    if (oldSocketId) room.socketToPlayer.delete(oldSocketId);
    room.playerToSocket.set(playerId, socketId);
    room.socketToPlayer.set(socketId, playerId);
    room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId)!);
    room.disconnectTimers.delete(playerId);
    return { success: true, state: room.state };
  });
  return result ?? { success: false, error: 'ROOM_NOT_FOUND' };
}

export async function leaveRoom(roomCode: string, playerId: string): Promise<{ success: boolean; state?: GameState }> {
  const result = await withRoomLock(roomCode, async (room) => {
    const r = applyAction(room.state, { type: 'room:leave', roomCode, playerId }, playerId);
    if (!r.success) return { success: false };
    room.state = r.state!;
    const socketId = room.playerToSocket.get(playerId);
    if (socketId) {
      room.playerToSocket.delete(playerId);
      room.socketToPlayer.delete(socketId);
    }
    room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId)!);
    room.disconnectTimers.delete(playerId);
    return { success: true, state: room.state };
  });
  return result ?? { success: false };
}

export function scheduleDisconnectLeave(roomCode: string, playerId: string, io: Server): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId)!);
  const timer = setTimeout(() => {
    leaveRoom(roomCode, playerId).then((r) => {
      if (r.success && r.state) {
        broadcastRoomUpdate(roomCode, r.state, io);
      }
      room.disconnectTimers.delete(playerId);
    });
  }, DISCONNECT_GRACE_MS);
  room.disconnectTimers.set(playerId, timer);
}

export function cancelDisconnectTimer(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  const t = room.disconnectTimers.get(playerId);
  if (t) {
    clearTimeout(t);
    room.disconnectTimers.delete(playerId);
  }
}

export async function reconnectPlayer(
  roomCode: string,
  playerId: string,
  socketId: string
): Promise<{ success: boolean; state?: GameState }> {
  const result = await withRoomLock(roomCode, async (room) => {
    const r = applyAction(room.state, { type: 'player:reconnect', roomCode, playerId }, playerId);
    if (!r.success) return { success: false };
    const oldSocketId = room.playerToSocket.get(playerId);
    if (oldSocketId) room.socketToPlayer.delete(oldSocketId);
    room.playerToSocket.set(playerId, socketId);
    room.socketToPlayer.set(socketId, playerId);
    cancelDisconnectTimer(roomCode, playerId);
    return { success: true, state: room.state };
  });
  return result ?? { success: false };
}

export async function dispatchAction(
  roomCode: string,
  action: GameAction,
  actorId: string,
  io: Server
): Promise<{ success: boolean; error?: string }> {
  const result = await withRoomLock(roomCode, async (room) => {
    const prevPhase = room.state.phase;
    const r = applyAction(room.state, action, actorId);
    if (!r.success) return { success: false, error: r.error };
    room.state = r.state!;

    if (action.type === 'game:start' && prevPhase === 'lobby' && room.state.phase === 'betting') {
      try {
        const persisted = await persistGameStart(roomCode, room.state);
        if (persisted) {
          room.dbGameId = persisted.gameId;
          room.dbPlayerIds = persisted.playerDbIds;
          room.persistedRoundNumbers.clear();
          room.gameOverPersisted = false;
        }
      } catch (e) {
        console.error('[Supabase] persistGameStart failed:', e);
      }
    }

    if (room.state.phase === 'roundEnd') {
      if (room.dbGameId && !room.persistedRoundNumbers.has(room.state.roundNumber)) {
        try {
          await persistRoundEnd({
            gameId: room.dbGameId,
            playerDbIds: room.dbPlayerIds,
            state: room.state,
          });
          room.persistedRoundNumbers.add(room.state.roundNumber);
        } catch (e) {
          console.error('[Supabase] persistRoundEnd failed:', e);
        }
      }
      for (const [, socketId] of room.playerToSocket) {
        io.to(socketId).emit('game:roundResult', { roundSummary: room.state.roundScores });
      }
      if (room.roundAdvanceTimer) clearTimeout(room.roundAdvanceTimer);
      const expectedVersion = room.state.stateVersion;
      room.roundAdvanceTimer = setTimeout(async () => {
        await withRoomLock(roomCode, async (lockedRoom) => {
          if (lockedRoom.state.phase !== 'roundEnd') return;
          if (lockedRoom.state.stateVersion !== expectedVersion) return;
          lockedRoom.state = advanceToNextRound(lockedRoom.state);
          for (const [, socketId] of lockedRoom.playerToSocket) {
            io.to(socketId).emit('game:phaseChange', {
              phase: lockedRoom.state.phase,
              roundNumber: lockedRoom.state.roundNumber,
            });
          }
          if (lockedRoom.state.phase === 'gameOver') {
            if (lockedRoom.dbGameId && !lockedRoom.gameOverPersisted) {
              try {
                await persistGameOver({
                  gameId: lockedRoom.dbGameId,
                  playerDbIds: lockedRoom.dbPlayerIds,
                  state: lockedRoom.state,
                });
                lockedRoom.gameOverPersisted = true;
              } catch (e) {
                console.error('[Supabase] persistGameOver failed:', e);
              }
            }
            for (const [, socketId] of lockedRoom.playerToSocket) {
              io.to(socketId).emit('game:gameOver', { finalScores: lockedRoom.state.totalScores });
            }
          }
          broadcastRoomUpdate(roomCode, lockedRoom.state, io);
        });
      }, ROUND_TRANSITION_DELAY_MS);
    }
    if (room.state.phase === 'gameOver') {
      if (room.dbGameId && !room.gameOverPersisted) {
        try {
          await persistGameOver({
            gameId: room.dbGameId,
            playerDbIds: room.dbPlayerIds,
            state: room.state,
          });
          room.gameOverPersisted = true;
        } catch (e) {
          console.error('[Supabase] persistGameOver failed:', e);
        }
      }
      for (const [, socketId] of room.playerToSocket) {
        io.to(socketId).emit('game:gameOver', { finalScores: room.state.totalScores });
      }
    }

    broadcastRoomUpdate(roomCode, room.state, io);
    return { success: true };
  });
  return result ?? { success: false, error: 'ROOM_NOT_FOUND' };
}

export function broadcastRoomUpdate(roomCode: string, state: GameState, io: Server): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  const publicState = { ...makePublicState(state), roomCode };
  for (const [playerId, socketId] of room.playerToSocket) {
    io.to(socketId).emit('room:update', publicState);
    io.to(socketId).emit('hand:update', getPrivateView(state, playerId));
  }
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function getPlayerIdBySocket(roomCode: string, socketId: string): string | undefined {
  return rooms.get(roomCode)?.socketToPlayer.get(socketId);
}
