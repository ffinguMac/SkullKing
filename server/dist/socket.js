import { createRoom, joinRoom, leaveRoom, dispatchAction, broadcastRoomUpdate, getRoom, getPlayerIdBySocket, scheduleDisconnectLeave, reconnectPlayer, } from './rooms/roomManager.js';
import { makePublicState, getPrivateView } from './game/view.js';
import { randomUUID } from 'crypto';
export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        let currentRoomCode = null;
        let playerId = socket.id;
        const emitError = (code, message) => {
            socket.emit('game:error', { code, message });
        };
        const emitToast = (message) => {
            socket.emit('game:toast', { message });
        };
        socket.on('room:create', (data) => {
            const nickname = data?.nickname ?? 'Player';
            playerId = randomUUID();
            try {
                const { roomCode, state } = createRoom(nickname, playerId, socket.id);
                currentRoomCode = roomCode;
                socket.emit('room:update', { ...makePublicState(state), roomCode });
                socket.emit('hand:update', getPrivateView(state, playerId));
                socket.emit('game:toast', { message: `방 생성됨: ${roomCode}` });
            }
            catch (e) {
                emitError('CREATE_FAILED', String(e));
            }
        });
        socket.on('room:join', async (data) => {
            const roomCode = (data?.roomCode ?? '').toUpperCase();
            const nickname = data?.nickname ?? 'Player';
            const existingPlayerId = data?.playerId;
            playerId = existingPlayerId ?? randomUUID();
            const result = await joinRoom(roomCode, nickname, playerId, socket.id);
            if (!result.success) {
                emitError(result.error ?? 'JOIN_FAILED', result.error ?? '참가 실패');
                return;
            }
            currentRoomCode = roomCode;
            socket.emit('room:update', { ...makePublicState(result.state), roomCode });
            socket.emit('hand:update', getPrivateView(result.state, playerId));
            emitToast(`방 ${roomCode} 참가`);
        });
        socket.on('room:leave', async (data) => {
            const roomCode = (data?.roomCode ?? currentRoomCode ?? '').toUpperCase();
            const pid = data?.playerId ?? playerId;
            const result = await leaveRoom(roomCode, pid);
            if (result.success) {
                currentRoomCode = null;
                broadcastRoomUpdate(roomCode, result.state, io);
            }
        });
        socket.on('room:ready', async (data) => {
            const roomCode = (data?.roomCode ?? currentRoomCode ?? '').toUpperCase();
            const pid = data?.playerId ?? playerId;
            const result = await dispatchAction(roomCode, { type: 'room:ready', roomCode, playerId: pid }, pid, io);
            if (!result.success)
                emitError(result.error ?? 'READY_FAILED', result.error ?? '');
        });
        socket.on('game:start', async (data) => {
            const roomCode = (data?.roomCode ?? currentRoomCode ?? '').toUpperCase();
            const pid = data?.playerId ?? playerId;
            const result = await dispatchAction(roomCode, { type: 'game:start', roomCode, playerId: pid }, pid, io);
            if (!result.success) {
                emitError(result.error ?? 'START_FAILED', result.error ?? '');
                return;
            }
            const room = getRoom(roomCode);
            if (room) {
                for (const [sid, plid] of room.socketToPlayer) {
                    io.to(sid).emit('game:phaseChange', {
                        phase: room.state.phase,
                        roundNumber: room.state.roundNumber,
                    });
                }
            }
        });
        socket.on('game:bet', async (data) => {
            const roomCode = (data?.roomCode ?? currentRoomCode ?? '').toUpperCase();
            const pid = data?.playerId ?? playerId;
            const result = await dispatchAction(roomCode, { type: 'game:bet', roomCode, playerId: pid, value: data.value }, pid, io);
            if (!result.success)
                emitError(result.error ?? 'BET_FAILED', result.error ?? '');
        });
        socket.on('game:playCard', async (data) => {
            const roomCode = (data?.roomCode ?? currentRoomCode ?? '').toUpperCase();
            const pid = data?.playerId ?? playerId;
            const result = await dispatchAction(roomCode, {
                type: 'game:playCard',
                roomCode,
                playerId: pid,
                cardIndex: data.cardId,
                tigressChoice: data.tigressChoice,
            }, pid, io);
            if (!result.success)
                emitError(result.error ?? 'PLAY_FAILED', result.error ?? '');
        });
        socket.on('player:reconnect', async (data) => {
            const roomCode = (data?.roomCode ?? '').toUpperCase();
            const pid = data?.playerId;
            if (!pid) {
                emitError('RECONNECT_FAILED', 'playerId required');
                return;
            }
            const result = await reconnectPlayer(roomCode, pid, socket.id);
            if (!result.success) {
                emitError('RECONNECT_FAILED', '재접속 실패');
                return;
            }
            currentRoomCode = roomCode;
            playerId = pid;
            socket.emit('room:update', { ...makePublicState(result.state), roomCode });
            socket.emit('hand:update', getPrivateView(result.state, pid));
            emitToast('재접속 성공');
        });
        socket.on('disconnect', () => {
            if (currentRoomCode) {
                const pid = getPlayerIdBySocket(currentRoomCode, socket.id) ?? playerId;
                scheduleDisconnectLeave(currentRoomCode, pid, io);
            }
        });
    });
}
