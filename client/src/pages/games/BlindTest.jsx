import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function BlindTest() {
  const { player, games, updateGame } = useContext(AppContext);

  const bt = games.blindtest ?? { state: 'waiting', players: [] };
  const hasJoined = bt.players?.find(p => p.id === player.id);

  const joinRound = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').maybeSingle();
    const s = data?.state || { state: 'waiting', players: [] };
    if (s.players?.find(p => p.id === player.id)) return;
    
    s.players = s.players ?? [];
    s.players.push({ id: player.id, name: player.name });
    
    await updateGame('blindtest', s);
  };

  const getThemes = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
  
    const schedule = [
      { start: 14 * 60, end: 14 * 60 + 30, name: "Années 2000", timeStr: "14h00" },
      { start: 14 * 60 + 30, end: 15 * 60, name: "Rap FR", timeStr: "14h30" },
      { start: 15 * 60, end: 15 * 60 + 30, name: "Génériques de séries", timeStr: "15h00" },
      { start: 15 * 60 + 30, end: 16 * 60, name: "Anime", timeStr: "15h30" },
      { start: 16 * 60, end: 16 * 60 + 30, name: "Disney / Pixar", timeStr: "16h00" },
    ];
  
    let current = null;
    let next = null;
  
    for (let i = 0; i < schedule.length; i++) {
      if (minutes >= schedule[i].start && minutes < schedule[i].end) {
        current = schedule[i];
        next = schedule[i + 1] || null;
        break;
      }
    }
  
    if (!current) {
      current = { name: "Pause / Hors planning", timeStr: "Maintenant" };
      for (let i = 0; i < schedule.length; i++) {
        if (minutes < schedule[i].start) {
          next = schedule[i];
          break;
        }
      }
      if (!next) next = schedule[0];
    }
  
    return { current, next };
  };

  const { current: currentTheme, next: nextTheme } = getThemes();

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center text-fuchsia-400">🎵 Blind Test</h1>
      
      <div className="bg-fuchsia-900/20 border border-fuchsia-500/20 rounded-xl p-4 text-center">
        <div className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-1">Thème Actuel</div>
        <div className="text-xl font-bold text-white mb-2">{currentTheme.name}</div>
        {nextTheme && (
          <div className="text-xs text-fuchsia-300">
            Prochain thème : {nextTheme.name} (à {nextTheme.timeStr})
          </div>
        )}
      </div>

      <div className="mt-8">
        {!hasJoined ? (
          <div className="glass-card p-6 border-t-4 border-fuchsia-500">
            <h3 className="text-center font-bold mb-5">Prêt à deviner la musique ?</h3>
            <button onClick={joinRound} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 py-5 rounded-xl font-bold text-xl touch-manipulation">
              Je participe ! ✋
            </button>
            <p className="text-xs text-zinc-500 mt-3 text-center">Tu peux rejoindre à tout moment, même pendant un son !</p>
          </div>
        ) : (
          <>
            {(bt.state === 'waiting' || bt.state === 'joining' || !bt.state) && (
              <div className="glass-card p-6 text-center border border-zinc-700/50">
                <p className="font-bold text-fuchsia-400 mb-2">Tu es inscrit !</p>
                <p className="text-zinc-400">Prépare-toi pour le prochain son.</p>
                <p className="text-xs text-zinc-500 mt-2 animate-pulse">En attente de l'administrateur...</p>
              </div>
            )}

            {bt.state === 'playing' && (
              <div className="glass-card p-8 text-center border border-fuchsia-500/50">
                <h2 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-4">Écoute bien !</h2>
                <div className="text-6xl mb-4 animate-bounce">🎧</div>
                <p className="text-lg text-fuchsia-300 font-bold">Lève la main si tu as la réponse !</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
