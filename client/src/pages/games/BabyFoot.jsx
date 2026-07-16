import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function BabyFoot() {
  const { player, games, updateGame, leaveAllQueues } = useContext(AppContext);
  const bf = games.babyfoot ?? { left: [], right: [], status: 'waiting', pool: 0 };

  const myLeft = bf.left?.find(p => p.id === player.id);
  const myRight = bf.right?.find(p => p.id === player.id);
  const myPlayer = myLeft || myRight;
  const isPlaying = !!myPlayer;

  const joinTeam = async (side) => {
    await leaveAllQueues();
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.status !== 'waiting') return alert('Match déjà en cours');
    if (s.left.find(p => p.id === player.id) || s.right.find(p => p.id === player.id)) return;
    const team = s[side];
    if (team.length >= 4) return alert('Équipe complète !');
    team.push({ id: player.id, name: player.name, bet: 0, vote: null });
    await updateGame('babyfoot', s);
  };

  const leaveTeam = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    s.left = s.left.filter(p => p.id !== player.id);
    s.right = s.right.filter(p => p.id !== player.id);
    await updateGame('babyfoot', s);
  };

  const [betAmount, setBetAmount] = React.useState(5);
  const placeBet = async () => {
    const amt = parseInt(betAmount);
    if (amt < 5 || amt > 20) return alert('Mise entre 5 et 20 🪙');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    const updateTeam = (team) => team.map(p => p.id === player.id ? { ...p, bet: amt } : p);
    s.left = updateTeam(s.left);
    s.right = updateTeam(s.right);
    s.pool = (s.pool ?? 0) + amt;
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('babyfoot', s);
  };

  const submitVote = async (winnerSide) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    const updateTeam = (team) => team.map(p => p.id === player.id ? { ...p, vote: winnerSide } : p);
    s.left = updateTeam(s.left);
    s.right = updateTeam(s.right);
    // Count votes
    const allPlayers = [...s.left, ...s.right];
    const voted = allPlayers.filter(p => p.vote);
    if (voted.length === allPlayers.length && allPlayers.length > 0) {
      const leftVotes = voted.filter(p => p.vote === 'left').length;
      const rightVotes = voted.filter(p => p.vote === 'right').length;
      if (leftVotes > rightVotes || rightVotes > leftVotes) {
        const winSide = leftVotes > rightVotes ? 'left' : 'right';
        const winners = s[winSide];
        const losers = s[winSide === 'left' ? 'right' : 'left'];
        const totalPool = s.pool;
        const winShare = Math.floor(totalPool / winners.length);
        for (const w of winners) {
          const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
          await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + winShare }).eq('id', w.id);
        }
        // Reset after 3s
        s.left = []; s.right = []; s.status = 'waiting'; s.pool = 0; s.votes = { left: 0, right: 0 };
      }
    }
    await updateGame('babyfoot', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center">⚽ Baby Foot</h1>

      {bf.status === 'betting' && myPlayer && !myPlayer.bet && (
        <div className="bg-rose-500/20 border border-rose-500 p-5 rounded-xl text-center">
          <h3 className="font-bold text-rose-400 mb-2">Le match va commencer !</h3>
          <p className="text-sm mb-4">Saisis ta mise (5-20🪙).</p>
          <div className="flex gap-2 justify-center items-center">
            <input type="number" min="5" max="20" value={betAmount} onChange={e => setBetAmount(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 w-24 text-center" />
            <button onClick={placeBet} className="bg-rose-600 hover:bg-rose-500 px-6 py-3 rounded-xl font-bold touch-manipulation">Miser</button>
          </div>
        </div>
      )}

      {bf.status === 'playing' && isPlaying && !myPlayer?.vote && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 p-5 rounded-xl text-center">
          <h3 className="font-bold text-emerald-400 mb-2 animate-pulse">Match en cours !</h3>
          <p className="text-sm text-zinc-300 mb-4">Votez pour l'équipe gagnante (l'unanimité est requise pour valider).</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => submitVote('left')} className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 py-4 rounded-xl border border-blue-500/50 font-bold touch-manipulation">🔵 Victoire Équipe Bleue</button>
            <button onClick={() => submitVote('right')} className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 py-4 rounded-xl border border-red-500/50 font-bold touch-manipulation">🔴 Victoire Équipe Rouge</button>
          </div>
        </div>
      )}

      {bf.pool > 0 && (
        <div className="text-center bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Cagnotte</span>
          <span className="text-3xl font-mono text-amber-400">{bf.pool} 🪙</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[['left','Bleue','blue'], ['right','Rouge','red']].map(([side, label, color]) => (
          <div key={side} className={`glass-card p-4 border-t-4 border-t-${color}-500`}>
            <h2 className={`font-bold text-${color}-400 mb-4 text-center`}>Équipe {label} ({bf[side].length}/4)</h2>
            <div className="space-y-2 min-h-[100px]">
              {bf[side].map(p => (
                <div key={p.id} className="bg-zinc-800/50 px-3 py-2 rounded flex justify-between items-center text-sm">
                  <span>{p.name}</span>
                  <div className="flex gap-2">
                    {p.bet > 0 && <span className="text-amber-400 font-mono text-xs">{p.bet}🪙</span>}
                    {p.vote && <span className="text-emerald-400 text-xs">✓ Voté</span>}
                    {p.id === player.id && bf.status === 'waiting' && (
                      <button onClick={leaveTeam} className="text-zinc-500 text-xs underline touch-manipulation">Quitter</button>
                    )}
                  </div>
                </div>
              ))}
              {bf[side].length === 0 && <p className="text-zinc-500 text-sm text-center italic mt-4">Place libre</p>}
            </div>
            {bf.status === 'waiting' && !isPlaying && bf[side].length < 4 && (
              <button onClick={() => joinTeam(side)} className={`w-full mt-4 bg-${color}-600/20 hover:bg-${color}-600/40 active:bg-${color}-600/60 text-${color}-300 py-4 rounded-xl border border-${color}-500/50 transition-colors font-bold touch-manipulation`}>
                Rejoindre l'équipe {label}
              </button>
            )}
          </div>
        ))}
      </div>

      {bf.status === 'waiting' && (bf.left.length > 0 || bf.right.length > 0) && (
        <p className="text-center text-zinc-500 text-sm">En attente de joueurs ou du lancement par un admin…</p>
      )}
    </div>
  );
}
