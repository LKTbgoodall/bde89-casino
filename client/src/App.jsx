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

const GAME_IDS = ['fifa','babyfoot','bluff1','bluff2','blindtest','quidanslasalle','imposteur1','imposteur2'];

function AppProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  // --- Session restore on page reload ---
  useEffect(() => {
    const sessionId = localStorage.getItem('casino_session');
    if (!sessionId) return;
    supabase
      .from('sessions')
      .select('players(*)')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (data?.players) {
          setPlayer(data.players);
          const p = window.location.pathname;
          if (p === '/' || p === '/login') {
            navigate(data.players.is_admin ? '/admin' : '/hub');
          }
        } else {
          localStorage.removeItem('casino_session');
        }
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
    // Initial load
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

  // --- Login helper ---
  const login = async (name, adminCode) => {
    const isAdmin = adminCode === ADMIN_CODE;

    // Upsert player by name
    let { data: existing } = await supabase
      .from('players').select('*').eq('name', name).maybeSingle();

    let playerData;
    if (existing) {
      if (isAdmin) {
        await supabase.from('players').update({ is_admin: true }).eq('id', existing.id);
        existing.is_admin = true;
      }
      playerData = existing;
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({ name, is_admin: isAdmin })
        .select().single();
      if (error) throw new Error(error.message);
      playerData = data;
    }

    // Create session
    const { data: session, error: sErr } = await supabase
      .from('sessions').insert({ player_id: playerData.id }).select().single();
    if (sErr) throw new Error(sErr.message);

    localStorage.setItem('casino_session', session.id);
    setPlayer(playerData);
    return playerData;
  };

  // --- Update game state helper ---
  const updateGame = async (gameId, newState) => {
    // Optimistic update
    setGames(prev => ({ ...prev, [gameId]: newState }));
    await supabase.from('game_states')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('game_id', gameId);
  };

  // --- Remove player from all physical queues (one game at a time) ---
  const leaveAllQueues = async () => {
    if (!player) return;
    for (const gId of ['fifa', 'babyfoot', 'imposteur1', 'imposteur2']) {
      const { data } = await supabase.from('game_states').select('state').eq('game_id', gId).single();
      if (!data) continue;
      let s = data.state;
      let changed = false;

      if (gId === 'fifa') {
        const before = s.queue.length;
        s.queue = s.queue.filter(p => p.id !== player.id);
        changed = s.queue.length !== before;
      } else if (gId === 'babyfoot') {
        const before = s.left.length + s.right.length;
        if (s.status === 'waiting') {
          s.left = s.left.filter(p => p.id !== player.id);
          s.right = s.right.filter(p => p.id !== player.id);
          changed = (s.left.length + s.right.length) !== before;
        }
      } else {
        const before = s.players.length;
        if (s.state === 'waiting') {
          s.players = s.players.filter(p => p.id !== player.id);
          changed = s.players.length !== before;
        }
      }
      if (changed) await updateGame(gId, s);
    }
  };

  return (
    <AppContext.Provider value={{ player, setPlayer, games, leaderboard, login, updateGame, leaveAllQueues }}>
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
          <Route path="/hub" element={<Hub />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/games/fifa" element={<Fifa />} />
          <Route path="/games/babyfoot" element={<BabyFoot />} />
          <Route path="/games/bluff/:id" element={<Bluff />} />
          <Route path="/games/blindtest" element={<BlindTest />} />
          <Route path="/games/quidanslasalle" element={<QuiDansLaSalle />} />
          <Route path="/games/undercover/:id" element={<Undercover />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
