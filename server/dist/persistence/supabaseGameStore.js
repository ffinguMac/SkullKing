import { createClient } from '@supabase/supabase-js';
let cachedClient;
function getSupabaseClient() {
    if (cachedClient !== undefined)
        return cachedClient;
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
        cachedClient = null;
        return cachedClient;
    }
    cachedClient = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedClient;
}
export async function persistGameStart(roomCode, state) {
    const client = getSupabaseClient();
    if (!client)
        return null;
    const activePlayers = state.players.filter((p) => state.activePlayerIds.includes(p.playerId));
    const playerDbIds = new Map();
    for (const p of activePlayers) {
        const { data, error } = await client
            .from('players')
            .insert({ nickname: p.nickname })
            .select('id')
            .single();
        if (error || !data)
            throw new Error(`persistGameStart players insert failed: ${error?.message ?? 'no data'}`);
        playerDbIds.set(p.playerId, data.id);
    }
    const { data: gameData, error: gameError } = await client
        .from('games')
        .insert({
        room_code: roomCode,
        status: 'in_progress',
        started_at: new Date().toISOString(),
    })
        .select('id')
        .single();
    if (gameError || !gameData) {
        throw new Error(`persistGameStart games insert failed: ${gameError?.message ?? 'no data'}`);
    }
    const gameId = gameData.id;
    const gamePlayersRows = state.activePlayerIds
        .map((pid, idx) => {
        const playerId = playerDbIds.get(pid);
        if (!playerId)
            return null;
        return {
            game_id: gameId,
            player_id: playerId,
            seat_no: idx,
            final_score: 0,
        };
    })
        .filter((row) => !!row);
    if (gamePlayersRows.length > 0) {
        const { error: gpError } = await client.from('game_players').insert(gamePlayersRows);
        if (gpError)
            throw new Error(`persistGameStart game_players insert failed: ${gpError.message}`);
    }
    return { gameId, playerDbIds };
}
export async function persistRoundEnd(args) {
    const client = getSupabaseClient();
    if (!client)
        return;
    const { gameId, playerDbIds, state } = args;
    const leadPlayerDbId = playerDbIds.get(state.turnOrder[0] ?? '');
    const { data: roundData, error: roundError } = await client
        .from('rounds')
        .upsert({
        game_id: gameId,
        round_number: state.roundNumber,
        tricks_per_round: state.tricksPerRound,
        lead_player_id: leadPlayerDbId ?? null,
    }, { onConflict: 'game_id,round_number' })
        .select('id')
        .single();
    if (roundError || !roundData) {
        throw new Error(`persistRoundEnd rounds upsert failed: ${roundError?.message ?? 'no data'}`);
    }
    const roundId = roundData.id;
    const { error: deleteError } = await client.from('round_player_results').delete().eq('round_id', roundId);
    if (deleteError)
        throw new Error(`persistRoundEnd cleanup failed: ${deleteError.message}`);
    const resultRows = state.roundScores
        .map((rs) => {
        const dbPlayerId = playerDbIds.get(rs.playerId);
        if (!dbPlayerId)
            return null;
        return {
            round_id: roundId,
            player_id: dbPlayerId,
            bet: state.bets[rs.playerId] ?? 0,
            tricks_won: state.wonCounts[rs.playerId] ?? 0,
            base_score: rs.baseScore,
            bonus_score: rs.bonus,
            total_score: rs.total,
        };
    })
        .filter((row) => !!row);
    if (resultRows.length > 0) {
        const { error: resultError } = await client.from('round_player_results').insert(resultRows);
        if (resultError)
            throw new Error(`persistRoundEnd round_player_results insert failed: ${resultError.message}`);
    }
}
export async function persistGameOver(args) {
    const client = getSupabaseClient();
    if (!client)
        return;
    const { gameId, playerDbIds, state } = args;
    const winner = Object.entries(state.totalScores).sort((a, b) => b[1] - a[1])[0];
    const winnerDbPlayerId = winner ? playerDbIds.get(winner[0]) ?? null : null;
    for (const pid of state.activePlayerIds) {
        const dbPlayerId = playerDbIds.get(pid);
        if (!dbPlayerId)
            continue;
        const { error } = await client
            .from('game_players')
            .update({ final_score: state.totalScores[pid] ?? 0 })
            .eq('game_id', gameId)
            .eq('player_id', dbPlayerId);
        if (error)
            throw new Error(`persistGameOver game_players update failed: ${error.message}`);
    }
    const { error: gameError } = await client
        .from('games')
        .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_player_id: winnerDbPlayerId,
    })
        .eq('id', gameId);
    if (gameError)
        throw new Error(`persistGameOver games update failed: ${gameError.message}`);
}
