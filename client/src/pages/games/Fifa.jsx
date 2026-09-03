import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Fifa() {
  const { player, games, updateGame, leaveAllQueues, isAlreadyInGame } = useContext(AppContext);
  const fifa = games.fifa ?? { queue: [], currentMatch: null, spectators: [] };
  const current = fifa.currentMatch;

  const inQueue = fifa.queue?.find(p => p.id === player.id);
  const isPlaying = current && (current.player1 === player.id || current.player2 === player.id);
  const isP1 = current?.player1 === player.id;
  const isP2 = current?.player2 === player.id;
  const amISpectatorBettor = current && fifa.spectators?.find(s => s.id === player.id);

  const joinQueue = async () => {
    const alreadyIn = isAlreadyInGame();
    if (alreadyIn) return alert(`Tu es déjà inscrit à : ${alreadyIn} !
Quitte ce jeu d'abord avant d'en rejoindre un autre.`);
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (s.queue.find(p => p.id === player.id)) return;
    if (s.currentMatch && (s.currentMatch.player1 === player.id || s.currentMatch.player2 === player.id)) return;
    s.queue.push({ id: player.id, name: player.name });
    // Auto-start match if 2+ in queue and no current match
    if (!s.currentMatch && s.queue.length >= 2) {
      const p1 = s.queue.shift();
      const p2 = s.queue.shift();
      s.currentMatch = {
        player1: p1.id, player2: p2.id,
        p1Name: p1.name, p2Name: p2.name,
        spectatorPool: 0,
        p1Ready: false, p2Ready: false,
        p1Vote: null, p2Vote: null,
        matchStarted: false
      };
    }
    await updateGame('fifa', s);
  };

  const leaveQueue = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    s.queue = s.queue.filter(p => p.id !== player.id);
    await updateGame('fifa', s);
  };

  const confirmReady = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (!s.currentMatch) return;
    if (isP1) s.currentMatch.p1Ready = true;
    else if (isP2) s.currentMatch.p2Ready = true;
    if (s.currentMatch.p1Ready && s.currentMatch.p2Ready) s.currentMatch.matchStarted = true;
    await updateGame('fifa', s);
  };

  const submitScore = async (winnerId) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state; const m = s.currentMatch;
    if (!m) return;
    if (isP1) m.p1Vote = winnerId;
    if (isP2) m.p2Vote = winnerId;
    if (m.p1Vote && m.p2Vote) {
      if (m.p1Vote === m.p2Vote) {
        // Pay winner +20 tokens
        const winner = m.p1Vote;
        const { data: wd } = await supabase.from('players').select('tokens').eq('id', winner).single();
        await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 20 }).eq('id', winner);

        // Resolve spectator bets — winning spectators get x2 their bet
        if (s.spectators?.length > 0) {
          const winningSpecs = s.spectators.filter(s => s.betOn === winner);
          for (const spec of winningSpecs) {
            const { data: sd } = await supabase.from('players').select('tokens').eq('id', spec.id).single();
            await supabase.from('players').update({ tokens: (sd?.tokens ?? 0) + spec.amount * 2 }).eq('id', spec.id);
          }
        }
        s.currentMatch = null; s.spectators = [];
      } else {
        // Disagreement: reset votes and show conflict message
        m.p1Vote = null;
        m.p2Vote = null;
        m.conflict = true;
      }
    }
    await updateGame('fifa', s);
  };

  const [specBet, setSpecBet] = React.useState(5);
  const [specOn, setSpecOn] = React.useState(null);

  const placeSpecBet = async () => {
    if (!specOn) return alert('Choisis un joueur !');
    const amt = parseInt(specBet);
    if (amt < 2 || amt > 10 || amt > player.tokens * 0.5) return alert('Mise invalide (2-10)');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (!s.currentMatch || s.currentMatch.matchStarted) return;
    s.currentMatch.spectatorPool = (s.currentMatch.spectatorPool ?? 0) + amt;
    s.spectators = s.spectators ?? [];
    s.spectators.push({ id: player.id, name: player.name, betOn: specOn, amount: amt });
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('fifa', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold">🎮 FIFA 1v1</h1>
      <p className="text-zinc-400 text-sm">Le gagnant remporte <span className="text-emerald-400 font-bold">+20 🪙</span> — tu ne risques rien !</p>

      {!current && (
        <div className="glass-card p-6 text-center">
          <p className="text-zinc-400">Aucun match en cours.</p>
        </div>
      )}

      {current && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-xl font-black text-blue-400">{current.p1Name}</div>
              <div className="text-xs mt-1">{current.p1Ready ? <span className="text-emerald-400">✓ Prêt</span> : <span className="text-amber-400 animate-pulse">En attente…</span>}</div>
            </div>
            <div className="text-3xl font-black text-zinc-700">VS</div>
            <div className="text-center flex-1">
              <div className="text-xl font-black text-red-400">{current.p2Name}</div>
              <div className="text-xs mt-1">{current.p2Ready ? <span className="text-emerald-400">✓ Prêt</span> : <span className="text-amber-400 animate-pulse">En attente…</span>}</div>
            </div>
          </div>

          {current.spectatorPool > 0 && (
            <div className="text-center bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Mise des spectateurs</span>
              <span className="text-2xl font-mono text-rose-400">{current.spectatorPool} 🪙</span>
            </div>
          )}

          {isPlaying && !current.matchStarted && !((isP1 && current.p1Ready) || (isP2 && current.p2Ready)) && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 text-center">
              <h3 className="font-bold mb-1">Confirme ta présence !</h3>
              <p className="text-zinc-400 text-sm mb-4">Gagnant : <span className="text-emerald-400 font-bold">+20 🪙</span> — aucune mise requise.</p>
              <button onClick={confirmReady} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-lg touch-manipulation">Je suis prêt ✊</button>
            </div>
          )}

          {isPlaying && !current.matchStarted && ((isP1 && current.p1Ready) || (isP2 && current.p2Ready)) && (
            <div className="text-center text-emerald-400">En attente de l'adversaire…</div>
          )}

          {isPlaying && current.matchStarted && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 text-center">
              <h3 className="font-bold text-rose-400 animate-pulse mb-3">MATCH EN COURS ⚽</h3>
              {current.conflict && <p className="text-sm font-bold text-red-500 mb-3 animate-pulse">⚠️ Le résultat n'est pas le même ! Mettez-vous d'accord pour continuer et avoir les points.</p>}
              <p className="text-sm text-zinc-400 mb-5">Jouez votre match puis déclarez le gagnant.</p>
              {!((isP1 && current.p1Vote) || (isP2 && current.p2Vote)) ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => submitScore(current.player1)} className="flex-1 bg-blue-600/20 border border-blue-500 hover:bg-blue-600/40 py-3 rounded-xl text-blue-400 font-bold touch-manipulation">Victoire {current.p1Name}</button>
                  <button onClick={() => submitScore(current.player2)} className="flex-1 bg-red-600/20 border border-red-500 hover:bg-red-600/40 py-3 rounded-xl text-red-400 font-bold touch-manipulation">Victoire {current.p2Name}</button>
                </div>
              ) : <div className="text-amber-400">Vote enregistré, en attente de l'adversaire…</div>}
            </div>
          )}

          {/* Spectator bet section */}
          {!isPlaying && !current.matchStarted && !amISpectatorBettor && (
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-bold text-sm text-zinc-400 mb-1">📣 Parier en spectateur (2-10🪙)</h3>
              <p className="text-xs text-zinc-500 mb-3">Les gagnants se partagent la cagnotte des spectateurs.</p>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button onClick={() => setSpecOn(current.player1)} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === current.player1 ? 'bg-blue-600/30 border-blue-500 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{current.p1Name}</button>
                  <button onClick={() => setSpecOn(current.player2)} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === current.player2 ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{current.p2Name}</button>
                </div>
                <div className="flex gap-2">
                  <input type="number" min="2" max="10" value={specBet} onChange={e => setSpecBet(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 w-24 text-center" />
                  <button onClick={placeSpecBet} className="flex-1 bg-rose-600 hover:bg-rose-500 py-3 rounded-xl font-bold touch-manipulation">Parier</button>
                </div>
              </div>
            </div>
          )}
          {!isPlaying && amISpectatorBettor && <div className="text-center text-emerald-400 text-sm">✓ Pari enregistré — bonne chance !</div>}
          {!isPlaying && current.matchStarted && <div className="text-center text-rose-500 animate-pulse font-bold text-sm">Match en cours — paris fermés !</div>}
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
                En file… ({fifa.queue.findIndex(p => p.id === player.id) + 1}e)
              </div>
              <button onClick={leaveQueue} className="text-zinc-500 text-sm underline touch-manipulation">Quitter la file</button>
            </div>
          )}
        </div>
      )}

      {fifa.queue?.length > 0 && (
        <div className="glass p-4 rounded-xl">
          <h3 className="font-bold text-zinc-300 mb-2">File d'attente ({fifa.queue.length})</h3>
          <div className="flex flex-wrap gap-2">
            {fifa.queue.map((q, i) => (
              <span key={q.id} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{i+1}. {q.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
