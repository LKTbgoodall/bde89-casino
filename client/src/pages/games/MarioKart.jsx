import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function MarioKart() {
  const { player, games, updateGame, leaveAllQueues, isAlreadyInGame } = useContext(AppContext);
  const mk = games.mariokart ?? { queue: [], currentMatch: null, spectators: [] };

  const inQueue = mk.queue?.find(p => p.id === player.id);
  const current = mk.currentMatch;
  const isPlaying = current?.players?.find(p => p.id === player.id);
  // for isPlaying, need to find the specific player object to check ready status
  const myPlayerInMatch = current?.players?.find(p => p.id === player.id);
  const amISpectatorBettor = mk.spectators?.find(s => s.id === player.id);

  const [specBet, setSpecBet] = React.useState(5);
  const [specOn, setSpecOn] = React.useState(null);

  const joinQueue = async () => {
    const alreadyIn = isAlreadyInGame();
    if (alreadyIn) return alert(`Tu es déjà inscrit à : ${alreadyIn} !
Quitte ce jeu d'abord avant d'en rejoindre un autre.`);
    
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'mariokart').single();
    const s = data.state;
    s.queue = s.queue ?? [];
    if (!s.queue.find(p => p.id === player.id)) {
      s.queue.push({ id: player.id, name: player.name });
      await updateGame('mariokart', s);
    }
  };

  const leaveQueue = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'mariokart').single();
    const s = data.state;
    if (s.queue) {
      s.queue = s.queue.filter(p => p.id !== player.id);
      await updateGame('mariokart', s);
    }
  };

  const confirmReady = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'mariokart').single();
    const s = data.state;
    const p = s.currentMatch.players.find(p => p.id === player.id);
    if (p) p.ready = true;
    
    // Auto start match if everyone is ready? Wait, Admin handles starting match for other games now, but maybe confirmReady does it?
    // Let's stick to: Players say they are ready, Admin starts it.
    await updateGame('mariokart', s);
  };

  const placeSpecBet = async () => {
    if (!specOn) return alert('Choisis un joueur sur qui parier !');
    const amt = parseInt(specBet);
    if (amt < 2 || amt > 10 || amt > player.tokens * 0.5) return alert('Mise invalide (2-10, max 50% de tes jetons)');
    
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'mariokart').single();
    const s = data.state;
    if (!s.currentMatch || s.currentMatch.matchStarted) return alert('Les paris sont fermés !');
    
    if (s.currentMatch.players.find(p => p.id === player.id)) return alert('Les joueurs ne peuvent pas parier !');
    if (s.spectators?.find(x => x.id === player.id)) return alert('Tu as déjà parié !');

    s.spectators = s.spectators ?? [];
    s.spectators.push({ id: player.id, name: player.name, betOn: specOn, amount: amt });
    s.currentMatch.spectatorPool = (s.currentMatch.spectatorPool ?? 0) + amt;
    
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('mariokart', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center">🏎️ Mario Kart</h1>
      <p className="text-zinc-400 text-sm text-center">Course à 4 ! 1er: <span className="text-emerald-400 font-bold">+20🪙</span> | 2e: <span className="text-emerald-400 font-bold">+15🪙</span> | 3e: <span className="text-emerald-400 font-bold">+10🪙</span> | 4e: <span className="text-emerald-400 font-bold">+5🪙</span></p>

      {!current && (
        <div className="glass-card p-6 text-center">
          <p className="text-zinc-400">Aucune course en cours.</p>
        </div>
      )}

      {current && (
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-xl font-bold text-center text-rose-400 mb-4">Course en cours</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {current.players.map((p, idx) => (
              <div key={p.id} className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700 text-center">
                <div className="font-bold text-lg text-white">{p.name}</div>
                <div className="text-xs mt-1">
                  {p.ready ? <span className="text-emerald-400">✓ Prêt</span> : <span className="text-amber-400 animate-pulse">En attente…</span>}
                </div>
              </div>
            ))}
          </div>

          {(current.spectatorPool ?? 0) > 0 && (
            <div className="text-center bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 mt-4">
              <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Mise totale des spectateurs</span>
              <span className="text-2xl font-mono text-rose-400">{current.spectatorPool} 🪙</span>
            </div>
          )}

          {isPlaying && !current.matchStarted && !myPlayerInMatch?.ready && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 text-center mt-4">
              <h3 className="font-bold mb-3">Tu es dans la prochaine course !</h3>
              <button onClick={confirmReady} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-lg touch-manipulation">Je suis prêt ✊</button>
            </div>
          )}

          {isPlaying && !current.matchStarted && myPlayerInMatch?.ready && (
            <div className="text-center text-emerald-400 mt-4">En attente des autres joueurs…</div>
          )}

          {isPlaying && current.matchStarted && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 text-center mt-4">
              <h3 className="font-bold text-rose-400 animate-pulse mb-3">COURSE EN COURS 🏎️💨</h3>
              <p className="text-sm text-zinc-400">Terminez votre course !<br/>Le staff se chargera d'enregistrer le classement à la fin.</p>
            </div>
          )}

          {/* Spectator bet section */}
          {!isPlaying && !current.matchStarted && !amISpectatorBettor && (
            <div className="border-t border-zinc-800 pt-4 mt-4">
              <h3 className="font-bold text-sm text-zinc-400 mb-1">📣 Parier sur le vainqueur (2-10🪙)</h3>
              <p className="text-xs text-zinc-500 mb-3">Ceux qui trouvent le 1er se partagent la cagnotte.</p>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {current.players.map(p => (
                    <button key={p.id} onClick={() => setSpecOn(p.id)} className={`py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === p.id ? 'bg-rose-600/30 border-rose-500 text-rose-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" min="2" max="10" value={specBet} onChange={e => setSpecBet(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 w-24 text-center" />
                  <button onClick={placeSpecBet} className="flex-1 bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-bold touch-manipulation">Parier</button>
                </div>
              </div>
            </div>
          )}
          {!isPlaying && amISpectatorBettor && <div className="text-center text-emerald-400 text-sm mt-4">✓ Pari enregistré — bonne chance !</div>}
          {!isPlaying && current.matchStarted && <div className="text-center text-rose-500 animate-pulse font-bold text-sm mt-4">Course en cours — paris fermés !</div>}
        </div>
      )}

      {!isPlaying && (
        <div className="glass-card p-6 text-center">
          {!inQueue ? (
            <button onClick={joinQueue} className="bg-rose-600 hover:bg-rose-500 active:bg-rose-400 text-white px-8 py-4 rounded-xl font-bold text-lg touch-manipulation w-full">
              Rejoindre la file d'attente
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-rose-400 animate-pulse font-medium">
                En file… ({mk.queue.findIndex(p => p.id === player.id) + 1}e)
              </div>
              <button onClick={leaveQueue} className="text-zinc-500 text-sm underline touch-manipulation">Quitter la file</button>
            </div>
          )}
        </div>
      )}

      {mk.queue?.length > 0 && (
        <div className="glass p-4 rounded-xl mt-4">
          <h3 className="font-bold text-zinc-300 mb-2">File d'attente ({mk.queue.length})</h3>
          <div className="flex flex-wrap gap-2">
            {mk.queue.map((q, i) => (
              <span key={q.id} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{i+1}. {q.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
