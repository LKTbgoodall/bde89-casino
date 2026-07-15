import React, { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const { player, setPlayer } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();

  if (!player) return null;

  const handleRebuy = async () => {
    if (player.tokens >= 20) return alert('Tu as encore assez de jetons !');
    if (player.rebuys <= 0) return alert('Plus de rebuys disponibles. Demande au BDE.');

    const last = player.last_rebuy ? new Date(player.last_rebuy) : null;
    if (last && Date.now() - last.getTime() < 30 * 60 * 1000) {
      return alert('Cooldown de 30 min entre deux rebuys.');
    }
    await supabase.from('players')
      .update({ tokens: player.tokens + 40, rebuys: player.rebuys - 1, last_rebuy: new Date().toISOString() })
      .eq('id', player.id);
  };

  const showBack = !['/hub', '/admin', '/login'].includes(location.pathname);
  const canRebuy = player.tokens < 20 && player.rebuys > 0;
  const needsAdmin = player.tokens < 20 && player.rebuys === 0;

  return (
    <nav className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
      <div className="container mx-auto px-3 py-2 max-w-4xl flex justify-between items-center gap-2">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          {showBack && (
            <button onClick={() => navigate(player.is_admin ? '/admin' : '/hub')}
              className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-lg shrink-0 touch-manipulation">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div className="flex flex-col truncate">
            <span className="font-bold text-sm sm:text-base truncate">{player.name}</span>
            {player.is_admin && <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">BDE Admin</span>}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {canRebuy && (
            <button onClick={handleRebuy}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded-full text-xs font-medium animate-pulse touch-manipulation">
              Rebuy
            </button>
          )}
          <div className="bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-inner">
            <span className="text-sm">🪙</span>
            <span className="font-mono font-bold text-sm">{player.tokens}</span>
          </div>
        </div>
      </div>
      {needsAdmin && !player.is_admin && (
        <div className="bg-rose-500/20 text-rose-300 text-xs text-center py-1 border-t border-rose-500/30">
          Plus de rebuys — demande des jetons au BDE.
        </div>
      )}
    </nav>
  );
}
