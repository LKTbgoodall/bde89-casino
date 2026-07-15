import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { socket } from '../socket';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { player } = useContext(AppContext);
  const [rebuying, setRebuying] = useState(false);
  const location = useLocation();

  if (!player) return null;

  const handleRebuy = () => {
    if (rebuying) return;
    setRebuying(true);
    socket.emit('rebuy', (res) => {
      setRebuying(false);
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  const canRebuy = player.tokens < 20 && player.rebuys > 0;
  const needsAdminTokens = player.tokens < 20 && player.rebuys === 0;
  const showBack = location.pathname !== '/hub' && location.pathname !== '/admin' && location.pathname !== '/login';

  return (
    <nav className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 py-3">
      <div className="container mx-auto px-4 max-w-4xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link to={player.isAdmin ? "/admin" : "/hub"} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors" title="Retour">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-lg">{player.name}</span>
            {player.isAdmin && <span className="text-xs text-rose-500 font-bold uppercase tracking-wider">BDE Admin</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {canRebuy && (
            <button 
              onClick={handleRebuy}
              disabled={rebuying}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-3 py-1 rounded-full text-sm font-medium hover:bg-emerald-500/30 transition-colors animate-pulse"
            >
              Rebuy (+40)
            </button>
          )}
          
          <div className="bg-zinc-800 border border-zinc-700 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-inner">
            <span className="text-xl">🪙</span>
            <span className="font-mono font-bold text-lg tracking-tight">
              {player.tokens}
            </span>
          </div>
        </div>
      </div>
      {needsAdminTokens && !player.isAdmin && (
        <div className="bg-rose-500/20 text-rose-300 text-xs text-center py-1 mt-1 border-t border-b border-rose-500/30">
          Tu n'as plus de rebuys. Demande des jetons au BDE.
        </div>
      )}
    </nav>
  );
}
