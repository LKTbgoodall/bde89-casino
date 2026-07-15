import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Fifa() {
  const { player, games, updateGame, leaveAllQueues } = useContext(AppContext);
  const fifa = games.fifa ?? { queue: [], currentMatch: null, spectators: [] };
  const current = fifa.currentMatch;

  const inQueue = fifa.queue?.find(p => p.id === player.id);
  const isPlaying = current && (current.player1 === player.id || current.player2 === player.id);
  const isP1 = current?.player1 === player.id;
  const isP2 = current?.player2 === player.id;
  const amISpectatorBettor = current && fifa.spectators?.find(s => s.id === player.id);

  const joinQueue = async () => {
    await leaveAllQueues();
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (s.queue.find(p => p.id === player.id)) return;
    if (s.currentMatch && (s.currentMatch.player1 === player.id || s.currentMatch.player2 === player.id)) return;
    s.queue.push({ id: player.id, name: player.name });
    // Auto-start match if 2+ in queue
    if (!s.currentMatch && s.queue.length >= 2) {
      const p1 = s.queue.shift();
      const p2 = s.queue.shift();
      s.currentMatch = { player1: p1.id, player2: p2.id, p1Name: p1.name, p2Name: p2.name, pool: 0, p1Ready: false, p2Ready: false, p1Bet: 0, p2Bet: 0, p1Vote: null, p2Vote: null, matchStarted: false };
    }
    await updateGame('fifa', s);
  };

  const leaveQueue = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    s.queue = s.queue.filter(p => p.id !== player.id);
    await updateGame('fifa', s);
  };

  const confirmMatch = async (bet) => {
    bet = parseInt(bet);
    if (bet < 5 || bet > 30 || bet > player.tokens * 0.5) return alert('Mise invalide (5-30, max 50% de tes jetons)');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (!s.currentMatch) return;
    if (isP1) { s.currentMatch.p1Ready = true; s.currentMatch.p1Bet = bet; }
    else if (isP2) { s.currentMatch.p2Ready = true; s.currentMatch.p2Bet = bet; }
    s.currentMatch.pool += bet;
    if (s.currentMatch.p1Ready && s.currentMatch.p2Ready) s.currentMatch.matchStarted = true;
    await supabase.from('players').update({ tokens: player.tokens - bet }).eq('id', player.id);
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
        // Pay winner
        const winner = m.p1Vote;
        const winnerTokens = winner === m.player1
          ? (await supabase.from('players').select('tokens').eq('id', m.player1).single()).data.tokens
          : (await supabase.from('players').select('tokens').eq('id', m.player2).single()).data.tokens;
        await supabase.from('players').update({ tokens: winnerTokens + m.pool }).eq('id', winner);
      } else {
        // Refund
        const p1t = (await supabase.from('players').select('tokens').eq('id', m.player1).single()).data?.tokens ?? 0;
        const p2t = (await supabase.from('players').select('tokens').eq('id', m.player2).single()).data?.tokens ?? 0;
        await supabase.from('players').update({ tokens: p1t + m.p1Bet }).eq('id', m.player1);
        await supabase.from('players').update({ tokens: p2t + m.p2Bet }).eq('id', m.player2);
      }
      s.currentMatch = null; s.spectators = [];
    }
    await updateGame('fifa', s);
  };

  const [betAmount, setBetAmount] = React.useState(5);
  const [specBet, setSpecBet] = React.useState(2);
  const [specOn, setSpecOn] = React.useState(null);

  const placeSpecBet = async () => {
    if (!specOn) return alert('Choisis un joueur !');
    const amt = parseInt(specBet);
    if (amt < 2 || amt > 15 || amt > player.tokens * 0.5) return alert('Mise invalide (2-15)');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (!s.currentMatch || s.currentMatch.matchStarted) return;
    s.currentMatch.pool += amt;
    s.spectators = s.spectators ?? [];
    s.spectators.push({ id: player.id, name: player.name, betOn: specOn, amount: amt });
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('fifa', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold">🎮 FIFA 1v1</h1>

      {!current && (
        <div className="glass-card p-6 text-center">
          <p className="text-zinc-400 mb-5">Aucun match en cours.</p>
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

      {current && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-xl font-black text-blue-400">{current.p1Name}</div>
              <div className="text-xs mt-1">{current.p1Ready ? <span className="text-emerald-400">✓ Prêt ({current.p1Bet}🪙)</span> : <span className="text-amber-400 animate-pulse">En attente…</span>}</div>
            </div>
            <div className="text-3xl font-black text-zinc-700">VS</div>
            <div className="text-center flex-1">
              <div className="text-xl font-black text-red-400">{current.p2Name}</div>
              <div className="text-xs mt-1">{current.p2Ready ? <span className="text-emerald-400">✓ Prêt ({current.p2Bet}🪙)</span> : <span className="text-amber-400 animate-pulse">En attente…</span>}</div>
            </div>
          </div>

          <div className="text-center bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Cagnotte</span>
            <span className="text-3xl font-mono text-rose-400">{current.pool} 🪙</span>
          </div>

          {isPlaying && !current.matchStarted && !((isP1 && current.p1Ready) || (isP2 && current.p2Ready)) && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
              <h3 className="font-bold mb-3">Confirme ton match !</h3>
              <input type="range" min="5" max={Math.min(30, Math.max(5, Math.floor(player.tokens/2)))} value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full accent-rose-500 mb-2" />
              <div className="text-center text-xl font-bold text-rose-400 mb-3">{betAmount} 🪙</div>
              <button onClick={() => confirmMatch(betAmount)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-lg touch-manipulation">Je suis là & je mise</button>
            </div>
          )}

          {isPlaying && !current.matchStarted && ((isP1 && current.p1Ready) || (isP2 && current.p2Ready)) && (
            <div className="text-center text-emerald-400">En attente de l'adversaire…</div>
          )}

          {isPlaying && current.matchStarted && (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 text-center">
              <h3 className="font-bold text-rose-400 animate-pulse mb-3">MATCH EN COURS ⚽</h3>
              <p className="text-sm text-zinc-400 mb-5">Jouez votre match (4 min) puis déclarez le gagnant.</p>
              {!((isP1 && current.p1Vote) || (isP2 && current.p2Vote)) ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => submitScore(current.player1)} className="flex-1 bg-blue-600/20 border border-blue-500 hover:bg-blue-600/40 py-3 rounded-xl text-blue-400 font-bold touch-manipulation">Victoire {current.p1Name}</button>
                  <button onClick={() => submitScore(current.player2)} className="flex-1 bg-red-600/20 border border-red-500 hover:bg-red-600/40 py-3 rounded-xl text-red-400 font-bold touch-manipulation">Victoire {current.p2Name}</button>
                </div>
              ) : <div className="text-amber-400">Vote enregistré, en attente de l'adversaire…</div>}
            </div>
          )}

          {!isPlaying && !current.matchStarted && !amISpectatorBettor && (
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="font-bold text-sm text-zinc-400 mb-3">Parier sur ce match (2-15🪙)</h3>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button onClick={() => setSpecOn(current.player1)} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === current.player1 ? 'bg-blue-600/30 border-blue-500 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{current.p1Name}</button>
                  <button onClick={() => setSpecOn(current.player2)} className={`flex-1 py-3 rounded-xl text-sm font-bold border touch-manipulation ${specOn === current.player2 ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{current.p2Name}</button>
                </div>
                <div className="flex gap-2">
                  <input type="number" min="2" max="15" value={specBet} onChange={e => setSpecBet(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 w-24 text-center" />
                  <button onClick={placeSpecBet} className="flex-1 bg-rose-600 hover:bg-rose-500 py-3 rounded-xl font-bold touch-manipulation">Parier</button>
                </div>
              </div>
            </div>
          )}
          {!isPlaying && current.matchStarted && <div className="text-center text-rose-500 animate-pulse font-bold text-sm">Match en cours — paris fermés !</div>}
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
