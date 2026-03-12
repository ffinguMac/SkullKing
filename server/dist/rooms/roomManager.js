import { applyAction, advanceToNextRound, createInitialState, } from '../game/stateMachine.js';
import { makePublicState, getPrivateView } from '../game/view.js';
const DISCONNECT_GRACE_MS = 60_000;
const rooms = new Map();
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateRoomCode() : code;
}
function acquireLock(room) {
    const prev = room.lock;
    let resolve;
    room.lock = new Promise((r) => { resolve = r; });
    room.lockResolve = resolve;
    return prev.then(() => () => {
        room.lockResolve?.();
    });
}
export async function withRoomLock(roomCode, fn) {
    const room = rooms.get(roomCode);
    if (!room)
        return null;
    const release = await acquireLock(room);
    try {
        return await fn(room);
    }
    finally {
        release();
    }
}
export function createRoom(nickname, playerId, socketId) {
    const roomCode = generateRoomCode();
    const state = createInitialState();
    const result = applyAction(state, { type: 'room:create', nickname }, playerId);
    if (!result.success || !result.state)
        throw new Error(result.error ?? 'CREATE_FAILED');
    const room = {
        roomCode,
        state: result.state,
        playerToSocket: new Map([[playerId, socketId]]),
        socketToPlayer: new Map([[socketId, playerId]]),
        disconnectTimers: new Map(),
        lock: Promise.resolve(),
        lockResolve: null,
    };
    rooms.set(roomCode, room);
    return { roomCode, state: result.state };
}
export async function joinRoom(roomCode, nickname, playerId, socketId) {
    const result = await withRoomLock(roomCode, async (room) => {
        const r = applyAction(room.state, { type: 'room:join', roomCode, nickname, playerId }, playerId);
        if (!r.success)
            return { success: false, error: r.error };
        room.state = r.state;
        const oldSocketId = room.playerToSocket.get(playerId);
        if (oldSocketId)
            room.socketToPlayer.delete(oldSocketId);
        room.playerToSocket.set(playerId, socketId);
        room.socketToPlayer.set(socketId, playerId);
        room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId));
        room.disconnectTimers.delete(playerId);
        return { success: true, state: room.state };
    });
    return result ?? { success: false, error: 'ROOM_NOT_FOUND' };
}
export async function leaveRoom(roomCode, playerId) {
    const result = await withRoomLock(roomCode, async (room) => {
        const r = applyAction(room.state, { type: 'room:leave', roomCode, playerId }, playerId);
        if (!r.success)
            return { success: false };
        room.state = r.state;
        const socketId = room.playerToSocket.get(playerId);
        if (socketId) {
            room.playerToSocket.delete(playerId);
            room.socketToPlayer.delete(socketId);
        }
        room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId));
        room.disconnectTimers.delete(playerId);
        return { success: true, state: room.state };
    });
    return result ?? { success: false };
}
export function scheduleDisconnectLeave(roomCode, playerId, io) {
    const room = rooms.get(roomCode);
    if (!room)
        return;
    room.disconnectTimers.get(playerId) && clearTimeout(room.disconnectTimers.get(playerId));
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
export function cancelDisconnectTimer(roomCode, playerId) {
    const room = rooms.get(roomCode);
    if (!room)
        return;
    const t = room.disconnectTimers.get(playerId);
    if (t) {
        clearTimeout(t);
        room.disconnectTimers.delete(playerId);
    }
}
export async function reconnectPlayer(roomCode, playerId, socketId) {
    const result = await withRoomLock(roomCode, async (room) => {
        const r = applyAction(room.state, { type: 'player:reconnect', roomCode, playerId }, playerId);
        if (!r.success)
            return { success: false };
        const oldSocketId = room.playerToSocket.get(playerId);
        if (oldSocketId)
            room.socketToPlayer.delete(oldSocketId);
        room.playerToSocket.set(playerId, socketId);
        room.socketToPlayer.set(socketId, playerId);
        cancelDisconnectTimer(roomCode, playerId);
        return { success: true, state: room.state };
    });
    return result ?? { success: false };
}
export async function dispatchAction(roomCode, action, actorId, io) {
    const result = await withRoomLock(roomCode, async (room) => {
        const r = applyAction(room.state, action, actorId);
        if (!r.success)
            return { success: false, error: r.error };
        room.state = r.state;
        if (room.state.phase === 'roundEnd') {
            for (const [, socketId] of room.playerToSocket) {
                io.to(socketId).emit('game:roundResult', { roundSummary: room.state.roundScores });
            }
            room.state = advanceToNextRound(room.state);
            for (const [, socketId] of room.playerToSocket) {
                io.to(socketId).emit('game:phaseChange', {
                    phase: room.state.phase,
                    roundNumber: room.state.roundNumber,
                });
            }
        }
        if (room.state.phase === 'gameOver') {
            for (const [, socketId] of room.playerToSocket) {
                io.to(socketId).emit('game:gameOver', { finalScores: room.state.totalScores });
            }
        }
        broadcastRoomUpdate(roomCode, room.state, io);
        return { success: true };
    });
    return result ?? { success: false, error: 'ROOM_NOT_FOUND' };
}
export function broadcastRoomUpdate(roomCode, state, io) {
    const room = rooms.get(roomCode);
    if (!room)
        return;
    const publicState = { ...makePublicState(state), roomCode };
    for (const [playerId, socketId] of room.playerToSocket) {
        io.to(socketId).emit('room:update', publicState);
        io.to(socketId).emit('hand:update', getPrivateView(state, playerId));
    }
}
export function getRoom(roomCode) {
    return rooms.get(roomCode);
}
export function getPlayerIdBySocket(roomCode, socketId) {
    return rooms.get(roomCode)?.socketToPlayer.get(socketId);
}
