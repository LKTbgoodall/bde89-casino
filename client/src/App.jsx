import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { socket } from './socket';

// Components
import Navbar from './components/Navbar';
import NeedAdmin from './components/NeedAdmin';

// Pages
import Login from './pages/Login';
import Hub from './pages/Hub';
import Admin from './pages/Admin';
import Screen from './pages/Screen';

// Game Pages
import Fifa from './pages/games/Fifa';
import BabyFoot from './pages/games/BabyFoot';
import Bluff from './pages/games/Bluff';
import BlindTest from './pages/games/BlindTest';
import QuiDansLaSalle from './pages/games/QuiDansLaSalle';
import Undercover from './pages/games/Undercover';

export const AppContext = createContext();

function AppProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      // Auto-reconnect with local storage if possible
      const savedName = localStorage.getItem('techcasino_name');
      const savedAdminCode = localStorage.getItem('techcasino_adminCode');
      if (savedName && !player) {
        socket.emit('join', { name: savedName, adminCode: savedAdminCode }, (res) => {
          if (res.success) {
            setPlayer(res.player);
            setGames(res.games);
            setLeaderboard(res.leaderboard);
            // Only redirect if on login/root page, otherwise stay where we are
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath === '/login') {
               navigate(res.player.isAdmin ? '/admin' : '/hub');
            }
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('player_update', (newPlayerState) => {
      setPlayer(newPlayerState);
    });

    socket.on('game_update', ({ game, state }) => {
      setGames(prev => ({ ...prev, [game]: state }));
    });

    socket.on('game_update_spectator', ({ game, state }) => {
      setGames(prev => ({ ...prev, [game]: state }));
    });

    socket.on('leaderboard_update', (newBoard) => {
      setLeaderboard(newBoard);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('player_update');
      socket.off('game_update');
      socket.off('game_update_spectator');
      socket.off('leaderboard_update');
    };
  }, [player, navigate]);

  return (
    <AppContext.Provider value={{ player, setPlayer, games, leaderboard, isConnected }}>
      <div className="bg-zinc-900 min-h-screen text-white font-sans selection:bg-rose-500 selection:text-white">
        {player && <Navbar />}
        <main className="container mx-auto px-4 py-6 pb-24 max-w-lg md:max-w-4xl">
          {children}
        </main>
        {player && <NeedAdmin />}
      </div>
    </AppContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/screen" element={<Screen />} />
          
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

export default App;
