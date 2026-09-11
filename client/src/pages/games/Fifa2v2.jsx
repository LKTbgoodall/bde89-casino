import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Fifa2v2() {
  const { player, games, updateGame, leaveAllQueues, isAlreadyInGame } = useContext(AppContext);
  const bf = games.fifa2v2 ?? { left: [], right: [], status: 'waiting', spectatorPool: 0, spectatorBets: [] };

  const myLeft = bf.left?.find(p => p.id === player.id);
  const myRight = bf.right?.find(p => p.id === player.id);
  const myPlayer = myLeft || myRight;
  const isPlaying = !!myPlayer;
  const amISpectatorBettor = bf.spectatorBets?.find(b => b.id === player.id);

  const joinTeam = async (side) => {
    const alreadyIn = isAlreadyInGame();
    if (alreadyIn) return alert(`Tu es déjà inscrit à : ${alreadyIn} !
Quitte ce jeu d'abord avant d'en rejoindre un autre.`);
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa2v2').single();
    const s = data.state;
    if (s.status !== 'waiting') return alert('Match déjà en cours');
    if (s.left.find(p => p.id === player.id) || s.right.find(p => p.id === player.id)) return;
    const team = s[side];
    if (team.length >= 2) return alert('Équipe complète !');
    team.push({ id: player.id, name: player.name, vote: null });
    await updateGame('fifa2v2', s);
  };

  const leaveTeam = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa2v2').single();
    const s = data.state;
    s.left = s.left.filter(p => p.id !== player.id);
    s.right = s.right.filter(p => p.id !== player.id);
    await updateGame('fifa2v2', s);
  };

  const [specBet, setSpecBet] = React.useState(5);
  const [specOn, setSpecOn] = React.useState(null);

  const placeSpecBet = async () => {
    if (!specOn) return alert('Choisis une équipe !');
    const amt = parseInt(specBet);
    if (amt < 2 || amt > 10 || amt > player.tokens * 0.5) return alert('Mise invalide (2-10)');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.status !== 'betting') return alert('Les paris ne sont ouverts que pendant la phase de mise !');
    // Check not a participant
    if (s.left.find(p => p.id === player.id) || s.right.find(p => p.id === player.id)) return alert('Les joueurs ne peuvent pas parier');
    if (s.spectatorBets?.find(b => b.id === player.id)) return alert('Tu as déjà parié');
    s.spectatorBets = s.spectatorBets ?? [];
    s.spectatorBets.push({ id: player.id, name: player.name, betOn: specOn, amount: amt });
    s.spectatorPool = (s.spectatorPool ?? 0) + amt;
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('fifa2v2', s);
  };

  // The admin will handle score submission

    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center">🎮 FIFA 2v2</h1>
      <p className="text-zinc-400 text-sm text-center">Les gagnants remportent <span className="text-emerald-400 font-bold">+20 🪙 chacun</span> — tu ne risques rien !</p>

      {bf.status === 'playing' && isPlaying && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 p-5 rounded-xl text-center">
          <h3 className="font-bold text-emerald-400 mb-2 animate-pulse">Match en cours !</h3>
          <p className="text-sm text-zinc-300">Jouez votre match ! Le staff se chargera d'enregistrer le résultat à la fin.</p>
        </div>
      )}

      {/* Spectator betting (only during betting, non-participants) */}
      {bf.status === 'betting' && !isPlaying && !amISpectatorBettor && (
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
      {bf.status === 'waiting' && !isPlaying && !amISpectatorBettor && (
        <div className="text-center text-zinc-500 font-bold text-sm glass-card p-4">Attente de l'admin pour ouvrir les paris…</div>
      )}
      {bf.status === 'playing' && !isPlaying && !amISpectatorBettor && (
        <div className="text-center text-rose-500 animate-pulse font-bold text-sm glass-card p-4">Match en cours — paris fermés !</div>
      )}
      {(bf.status === 'playing' || bf.status === 'betting') && !isPlaying && amISpectatorBettor && (
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
            <h2 className={`font-bold text-${color}-400 mb-4 text-center`}>Équipe {label} ({bf[side].length}/2)</h2>
            <div className="space-y-2 min-h-[100px]">
              {bf[side].map(p => (
                <div key={p.id} className="bg-zinc-800/50 px-3 py-2 rounded flex justify-between items-center text-sm">
                  <span>{p.name}</span>
                  <div className="flex gap-2">
                    {p.id === player.id && bf.status === 'waiting' && (
                      <button onClick={leaveTeam} className="text-zinc-500 text-xs underline touch-manipulation">Quitter</button>
                    )}
                  </div>
                </div>
              ))}
              {bf[side].length === 0 && <p className="text-zinc-500 text-sm text-center italic mt-4">Place libre</p>}
            </div>
            {bf.status === 'waiting' && !isPlaying && bf[side].length < 2 && (
              <button onClick={() => joinTeam(side)} className={`w-full mt-4 bg-${color}-600/20 hover:bg-${color}-600/40 active:bg-${color}-600/60 text-${color}-300 py-4 rounded-xl border border-${color}-500/50 transition-colors font-bold touch-manipulation`}>
                Rejoindre l'équipe {label}
              </button>
            )}
          </div>
        ))}
      </div>

      {bf.status === 'waiting' && (bf.left.length > 0 || bf.right.length > 0) && (
        <div className="bg-zinc-800/50 p-4 rounded-xl text-center border border-zinc-700 mt-6">
          <p className="text-zinc-400 font-medium">Demandez à un admin de lancer les paris quand vous êtes prêts !</p>
        </div>
      )}
      
      {bf.status === 'betting' && isPlaying && (
        <div className="bg-amber-500/10 p-4 rounded-xl text-center border border-amber-500/50 mt-6">
          <h3 className="text-amber-400 font-bold animate-pulse">Les paris sont ouverts !</h3>
          <p className="text-zinc-300 text-sm mt-1">Le match va bientôt commencer, attendez le feu vert de l'admin.</p>
        </div>
      )}
    </div>
  );
}
