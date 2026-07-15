import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// Helper: update a game's state in DB (triggers realtime for all clients)
export async function setGameState(gameId, newState) {
  const { error } = await supabase
    .from('game_states')
    .update({ state: newState, updated_at: new Date().toISOString() })
    .eq('game_id', gameId);
  if (error) console.error('setGameState error:', error);
}

// Helper: get current game state
export async function getGameState(gameId) {
  const { data } = await supabase
    .from('game_states')
    .select('state')
    .eq('game_id', gameId)
    .single();
  return data?.state ?? null;
}

// Helper: add/subtract tokens atomically
export async function addTokens(playerId, delta) {
  const { data } = await supabase
    .from('players')
    .select('tokens')
    .eq('id', playerId)
    .single();
  if (!data) return;
  await supabase
    .from('players')
    .update({ tokens: data.tokens + delta })
    .eq('id', playerId);
}
