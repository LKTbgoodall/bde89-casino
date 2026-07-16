import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Admin from './pages/Admin';
import Fifa from './pages/games/Fifa';
import BabyFoot from './pages/games/BabyFoot';
import Bluff from './pages/games/Bluff';
import BlindTest from './pages/games/BlindTest';
import QuiDansLaSalle from './pages/games/QuiDansLaSalle';
import Undercover from './pages/games/Undercover';

export const AppContext = createContext();
export const ADMIN_CODE = 'GA-Dripbde-EBS89FHL';

// Guard: redirect to /login if not logged in
function RequireAuth({ children }) {
  const { player, loading } = useContext(AppContext);
  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-400">Chargement...</div>;
  if (!player) return <Navigate to="/login" replace />;
  return children;
}

function AppProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true); // true while checking session
  const navigate = useNavigate();

  // --- Session restore on page reload ---
  useEffect(() => {
    const sessionId = localStorage.getItem('casino_session');
    if (!sessionId) { setLoading(false); return; }

    supabase
      .from('sessions')
      .select('players(*)')
      .eq('id', sessionId)
      .single()
      .then(({ data, error }) => {
        if (data?.players) {
          setPlayer(data.players);
          const p = window.location.pathname;
          if (p === '/' || p === '/login') {
            navigate(data.players.is_admin ? '/admin' : '/hub');
          }
        } else {
          localStorage.removeItem('casino_session');
        }
        setLoading(false);
      });
  }, []);

  // --- Subscribe to OWN player updates ---
  useEffect(() => {
    if (!player?.id) return;
    const ch = supabase
      .channel('my-player-' + player.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'players',
        filter: `id=eq.${player.id}`
      }, ({ new: p }) => setPlayer(p))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [player?.id]);

  // --- Subscribe to all game states ---
  useEffect(() => {
    supabase.from('game_states').select('game_id,state').then(({ data }) => {
      if (data) {
        const map = {};
        data.forEach(r => { map[r.game_id] = r.state; });
        setGames(map);
      }
    });

    const ch = supabase
      .channel('game-states-all')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_states'
      }, ({ new: row }) => {
        setGames(prev => ({ ...prev, [row.game_id]: row.state }));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // --- Leaderboard ---
  useEffect(() => {
    const loadLB = () =>
      supabase.from('players')
        .select('id,name,tokens')
        .eq('is_admin', false)
        .order('tokens', { ascending: false })
        .limit(30)
        .then(({ data }) => { if (data) setLeaderboard(data); });

    loadLB();
    const ch = supabase
      .channel('lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, loadLB)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // --- Login ---
  const login = async (firstName, lastName, adminCode) => {
    const isAdmin = adminCode === ADMIN_CODE;
    const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
    const shortName = `${firstName} ${lastName.charAt(0).toUpperCase()}.`;

    let { data: existing } = await supabase
      .from('players').select('*').eq('full_name', fullName).maybeSingle();

    let playerData;
    if (existing) {
      if (isAdmin && !existing.is_admin) {
        await supabase.from('players').update({ is_admin: true }).eq('id', existing.id);
        existing.is_admin = true;
      }
      playerData = existing;
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({ name: shortName, full_name: fullName, is_admin: isAdmin })
        .select().single();
      if (error) throw new Error(error.message);
      playerData = data;
    }

    const { data: session, error: sErr } = await supabase
      .from('sessions').insert({ player_id: playerData.id }).select().single();
    if (sErr) throw new Error(sErr.message);

    localStorage.setItem('casino_session', session.id);
    setPlayer(playerData);
    return playerData;
  };

  // --- Update game state ---
  const updateGame = async (gameId, newState) => {
    setGames(prev => ({ ...prev, [gameId]: newState }));
    const { error } = await supabase.from('game_states')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('game_id', gameId);
    if (error) console.error('updateGame error:', gameId, error);
  };

  // --- Remove player from all physical queues ---
  const leaveAllQueues = async (pid) => {
    const playerId = pid ?? player?.id;
    if (!playerId) return;

    for (const gId of ['fifa', 'babyfoot', 'imposteur1', 'imposteur2']) {
      const { data } = await supabase.from('game_states').select('state').eq('game_id', gId).single();
      if (!data) continue;
      let s = { ...data.state };
      let changed = false;

      if (gId === 'fifa') {
        const before = s.queue.length;
        s.queue = s.queue.filter(p => p.id !== playerId);
        changed = s.queue.length !== before;
      } else if (gId === 'babyfoot') {
        if (s.status === 'waiting') {
          const before = s.left.length + s.right.length;
          s.left = s.left.filter(p => p.id !== playerId);
          s.right = s.right.filter(p => p.id !== playerId);
          changed = (s.left.length + s.right.length) !== before;
        }
      } else {
        if (s.state === 'waiting') {
          const before = s.players.length;
          s.players = s.players.filter(p => p.id !== playerId);
          changed = s.players.length !== before;
        }
      }
      if (changed) await updateGame(gId, s);
    }
  };

  return (
    <AppContext.Provider value={{ player, setPlayer, games, leaderboard, loading, login, updateGame, leaveAllQueues }}>
      <div className="bg-zinc-900 min-h-screen text-white font-sans">
        {player && <Navbar />}
        <main className="container mx-auto px-4 py-6 pb-24 max-w-lg md:max-w-4xl">
          {children}
        </main>
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/hub" element={<RequireAuth><Hub /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/games/fifa" element={<RequireAuth><Fifa /></RequireAuth>} />
          <Route path="/games/babyfoot" element={<RequireAuth><BabyFoot /></RequireAuth>} />
          <Route path="/games/bluff/:id" element={<RequireAuth><Bluff /></RequireAuth>} />
          <Route path="/games/blindtest" element={<RequireAuth><BlindTest /></RequireAuth>} />
          <Route path="/games/quidanslasalle" element={<RequireAuth><QuiDansLaSalle /></RequireAuth>} />
          <Route path="/games/undercover/:id" element={<RequireAuth><Undercover /></RequireAuth>} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
