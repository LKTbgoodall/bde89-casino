import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function BabyFoot() {
  const { player, games, updateGame, leaveAllQueues, isAlreadyInGame } = useContext(AppContext);
  const bf = games.babyfoot ?? { left: [], right: [], status: 'waiting', spectatorPool: 0, spectatorBets: [] };

  const myLeft = bf.left?.find(p => p.id === player.id);
  const myRight = bf.right?.find(p => p.id === player.id);
  const myPlayer = myLeft || myRight;
  const isPlaying = !!myPlayer;
  const amISpectatorBettor = bf.spectatorBets?.find(b => b.id === player.id);

  const joinTeam = async (side) => {
    const alreadyIn = isAlreadyInGame();
    if (alreadyIn) return alert(`Tu es déjà inscrit à : ${alreadyIn} !
Quitte ce jeu d'abord avant d'en rejoindre un autre.`);
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.status !== 'waiting') return alert('Match déjà en cours');
    if (s.left.find(p => p.id === player.id) || s.right.find(p => p.id === player.id)) return;
    const team = s[side];
    if (team.length >= 4) return alert('Équipe complète !');
    team.push({ id: player.id, name: player.name, vote: null });
    await updateGame('babyfoot', s);
  };

  const leaveTeam = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    s.left = s.left.filter(p => p.id !== player.id);
    s.right = s.right.filter(p => p.id !== player.id);
    await updateGame('babyfoot', s);
  };

  const [specBet, setSpecBet] = React.useState(5);
  const [specOn, setSpecOn] = React.useState(null);

  const placeSpecBet = async () => {
    if (!specOn) return alert('Choisis une équipe !');
    const amt = parseInt(specBet);
    if (amt < 2 || amt > 10 || amt > player.tokens * 0.5) return alert('Mise invalide (2-10)');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    // Check not a participant
    if (s.left.find(p => p.id === player.id) || s.right.find(p => p.id === player.id)) return alert('Les joueurs ne peuvent pas parier');
    if (s.spectatorBets?.find(b => b.id === player.id)) return alert('Tu as déjà parié');
    s.spectatorBets = s.spectatorBets ?? [];
    s.spectatorBets.push({ id: player.id, name: player.name, betOn: specOn, amount: amt });
    s.spectatorPool = (s.spectatorPool ?? 0) + amt;
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
      const threshold = Math.ceil(allPlayers.length * 0.75);
      if (leftVotes >= threshold || rightVotes >= threshold) {
        const winSide = leftVotes >= threshold ? 'left' : 'right';
        const winners = s[winSide];
        // Each winner gets +15 tokens
        for (const w of winners) {
          const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
          await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 15 }).eq('id', w.id);
          // Resolve spectator bets — winning spectators get x2 their bet
          if (s.spectatorBets?.length > 0) {
            const winningSpecs = s.spectatorBets.filter(b => b.betOn === winSide);
            for (const spec of winningSpecs) {
              const { data: sd } = await supabase.from('players').select('tokens').eq('id', spec.id).single();
              await supabase.from('players').update({ tokens: (sd?.tokens ?? 0) + spec.amount * 2 }).eq('id', spec.id);
            }
          }
        }
        s.left = []; s.right = []; s.status = 'waiting'; s.spectatorBets = []; s.spectatorPool = 0; s.conflict = false;
      } else {
        // Disagreement: reset votes and show conflict message
        s.left.forEach(p => p.vote = null);
        s.right.forEach(p => p.vote = null);
        s.conflict = true;
      }
    }
    await updateGame('babyfoot', s);
  };

  const adminSubmitVote = async (winnerSide) => {
    if (!player?.is_admin) return;
    if (!window.confirm("Forcer la victoire pour cette équipe ?")) return;
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.status !== 'playing') return;

    const winners = s[winnerSide];
    for (const w of winners) {
      const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
      await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 15 }).eq('id', w.id);
      
      if (s.spectatorBets?.length > 0) {
        const winningSpecs = s.spectatorBets.filter(b => b.betOn === winnerSide);
        for (const spec of winningSpecs) {
          const { data: sd } = await supabase.from('players').select('tokens').eq('id', spec.id).single();
          await supabase.from('players').update({ tokens: (sd?.tokens ?? 0) + spec.amount * 2 }).eq('id', spec.id);
        }
      }
    }
    s.left = []; s.right = []; s.status = 'waiting'; s.spectatorBets = []; s.spectatorPool = 0; s.conflict = false;
    await updateGame('babyfoot', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center">⚽ Baby Foot</h1>
      <p className="text-zinc-400 text-sm text-center">Les gagnants remportent <span className="text-emerald-400 font-bold">+15 🪙 chacun</span> — tu ne risques rien !</p>

      {bf.status === 'playing' && isPlaying && !myPlayer?.vote && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 p-5 rounded-xl text-center">
          <h3 className="font-bold text-emerald-400 mb-2 animate-pulse">Match en cours !</h3>
          {bf.conflict && <p className="text-sm font-bold text-red-500 mb-3 animate-pulse">⚠️ Le résultat n'est pas le même ! Mettez-vous d'accord pour valider et recevoir les jetons.</p>}
          <p className="text-sm text-zinc-300 mb-4">Votez pour l'équipe gagnante (75% requis pour valider).</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => submitVote('left')} className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 py-4 rounded-xl border border-blue-500/50 font-bold touch-manipulation">🔵 Victoire Équipe Bleue</button>
            <button onClick={() => submitVote('right')} className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 py-4 rounded-xl border border-red-500/50 font-bold touch-manipulation">🔴 Victoire Équipe Rouge</button>
          </div>
        </div>
      )}

      {player?.is_admin && bf.status === 'playing' && (
        <div className="bg-purple-900/30 border border-purple-500 p-4 rounded-xl text-center mt-4">
          <h3 className="text-purple-300 font-bold mb-2">🛠 Action Admin : Forcer le résultat</h3>
          <div className="flex gap-2">
            <button onClick={() => adminSubmitVote('left')} className="flex-1 bg-purple-600/50 hover:bg-purple-500 py-3 rounded-xl text-sm font-bold text-purple-100 touch-manipulation">Victoire Bleue</button>
            <button onClick={() => adminSubmitVote('right')} className="flex-1 bg-purple-600/50 hover:bg-purple-500 py-3 rounded-xl text-sm font-bold text-purple-100 touch-manipulation">Victoire Rouge</button>
          </div>
        </div>
      )}

      {/* Spectator betting (only during playing, non-participants) */}
      {bf.status === 'playing' && !isPlaying && !amISpectatorBettor && (
        <div className="glass-card p-5 border-t-4 border-amber-500">
          <h3 className="font-bold text-amber-400 mb-1">📣 Parier en spectateur (2-10🪙)</h3>
          <p className="text-xs text-zinc-500 mb-3">Les spectateurs gagnants se partagent la cagnotte.</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setSpecOn('left')} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === 'left' ? 'bg-blue-600/30 border-blue-500 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>🔵 Équipe Bleue</button>
              <button onClick={() => setSpecOn('right')} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === 'right' ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>🔴 Équipe Rouge</button>
            </div>
            <div className="flex gap-2">
              <input type="number" min="2" max="10" value={specBet} onChange={e => setSpecBet(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 w-24 text-center" />
              <button onClick={placeSpecBet} className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-bold touch-manipulation">Parier</button>
            </div>
          </div>
        </div>
      )}
      {bf.status === 'playing' && !isPlaying && amISpectatorBettor && (
        <div className="text-center text-emerald-400 text-sm glass-card p-4">✓ Pari enregistré sur {amISpectatorBettor.betOn === 'left' ? '🔵 Bleue' : '🔴 Rouge'} — bonne chance !</div>
      )}

      {(bf.spectatorPool ?? 0) > 0 && (
        <div className="text-center bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
          <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Cagnotte spectateurs</span>
          <span className="text-3xl font-mono text-amber-400">{bf.spectatorPool} 🪙</span>
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
