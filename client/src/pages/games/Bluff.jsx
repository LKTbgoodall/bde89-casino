import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Bluff() {
  const { id } = useParams();
  const { player, games, updateGame, leaveAllQueues } = useContext(AppContext);
  const tableId = id === 'bluff1' || id === 'bluff2' ? id : 'bluff1';
  const [betAmount, setBetAmount] = React.useState(5);

  const b = games[tableId] ?? { state: 'waiting', active: null, bets: [], pool: 0, queue: [] };
  const inQueue = b.queue?.find(p => p.id === player.id);
  const myBet = b.bets?.find(bet => bet.playerId === player.id);
  const playerActive = b.active?.id === player.id;

  const joinQueue = async () => {
    await leaveAllQueues();
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tableId).single();
    const s = data.state;
    if (s.state !== 'waiting') return alert('Le round a déjà commencé !');
    s.queue = s.queue || [];
    if (!s.queue.find(p => p.id === player.id)) {
      s.queue.push({ id: player.id, name: player.name });
      await updateGame(tableId, s);
    }
  };

  const leaveQueue = async () => {
    await leaveAllQueues();
  };

  const placeBet = async (isTruth) => {
    const amt = parseInt(betAmount);
    if (amt < 2 || amt > 15) return alert('Mise entre 2 et 15 🪙');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tableId).single();
    const s = data.state;
    if (s.bets?.find(b => b.playerId === player.id)) return;
    s.bets = s.bets ?? [];
    s.bets.push({ playerId: player.id, playerName: player.name, isTruth, amount: amt });
    s.pool = (s.pool ?? 0) + amt;
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame(tableId, s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="mb-6 flex justify-between items-center bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
        <div>
          <div className="text-zinc-400 text-sm">Table</div>
          <div className="font-bold">{tableId === 'bluff1' ? 'Table 1' : 'Table 2'}</div>
        </div>
        <div className="text-right">
          <div className="text-zinc-400 text-sm">Cagnotte Globale</div>
          <div className="font-bold text-amber-400 text-xl">{b.pool}🪙</div>
        </div>
      </div>

      {b.state === 'waiting' && (
        <div className="glass-card p-8 text-center border-t-4 border-indigo-500 flex flex-col items-center">
          <div className="text-4xl mb-4 animate-bounce">🪑</div>
          <h2 className="text-2xl font-black mb-2">Prends place</h2>
          <p className="text-zinc-400 mb-6">Inscris-toi sur la liste. L'animateur choisira quelqu'un pour monter sur scène et raconter son anecdote.</p>

          {inQueue ? (
            <div className="w-full">
              <div className="bg-indigo-500/20 text-indigo-300 py-3 rounded-xl mb-4 font-bold border border-indigo-500/30">
                Tu es dans la file d'attente ({(b.queue?.findIndex(p => p.id === player.id) ?? 0) + 1}/{b.queue?.length})
              </div>
              <button onClick={leaveQueue} className="text-rose-400 text-sm underline touch-manipulation">Quitter la file</button>
            </div>
          ) : (
            <button onClick={joinQueue} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg touch-manipulation">
              Rejoindre la partie
            </button>
          )}

          {b.queue?.length > 0 && (
            <div className="mt-6 w-full text-left">
              <h3 className="text-sm font-bold text-zinc-500 mb-2 uppercase">File d'attente :</h3>
              <div className="flex flex-wrap gap-2">
                {b.queue.map(p => (
                  <span key={p.id} className="bg-zinc-800 border border-zinc-700 px-3 py-1 rounded-full text-sm">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {b.state === 'betting' && !playerActive && (
        <div className="glass-card p-6 border-t-4 border-amber-500">
          <div className="text-center mb-6">
            <span className="text-zinc-400 text-sm block mb-2">C'est à</span>
            <span className="text-3xl font-black text-amber-400">{b.active?.name}</span>
            <span className="text-zinc-400 text-sm block mt-2">de raconter son anecdote !</span>
          </div>

          {!myBet ? (
            <>
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-2">Ta mise : {betAmount}🪙</label>
                <input type="range" min="1" max={Math.max(1, player.tokens)} value={betAmount} onChange={e => setBetAmount(e.target.value)} className="w-full accent-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => placeBet(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-base touch-manipulation">
                  ✅ Vérité
                </button>
                <button onClick={() => placeBet(false)} className="w-full bg-zinc-600 hover:bg-zinc-500 py-3 rounded-xl font-bold text-base touch-manipulation">
                  🤡 Bluff
                </button>
              </div>
            </>
          ) : (
            <div className="text-center bg-zinc-800/80 p-6 rounded-xl border border-zinc-700">
              <div className="text-2xl mb-2">{myBet.isTruth ? '✅' : '🤡'}</div>
              <p className="font-bold text-zinc-200">Tu as misé <span className="text-amber-400">{myBet.amount}🪙</span> sur {myBet.isTruth ? 'la Vérité' : 'un Bluff'}</p>
              <p className="text-zinc-500 text-sm mt-3 animate-pulse">En attente de la révélation…</p>
              <div className="mt-3 text-xs text-zinc-400">{b.bets?.length} pari(s) enregistré(s)</div>
            </div>
          )}
        </div>
      )}

      {b.state === 'betting' && playerActive && (
        <div className="glass-card p-8 text-center border-t-4 border-rose-500 flex flex-col items-center">
          <div className="text-5xl mb-4 animate-bounce">🎤</div>
          <h2 className="text-2xl font-black mb-2 text-rose-400">Tu es sur scène !</h2>
          <p className="text-zinc-300 mb-6 font-medium">Raconte ton anecdote à l'assemblée. Fais-les douter !</p>
          <div className="bg-zinc-800/80 p-4 rounded-xl border border-zinc-700 w-full text-center">
            <div className="text-xl font-bold text-amber-400">{b.pool} 🪙</div>
            <div className="text-sm text-zinc-400">dans la cagnotte ({b.bets?.length || 0} paris)</div>
          </div>
        </div>
      )}

      {b.state === 'revealed' && (
        <div className="glass-card p-8 text-center border-2 border-emerald-500/50">
          <h2 className="text-2xl font-black mb-4">Révélation !</h2>
          <p className="text-zinc-400 text-sm">Les gagnants ont reçu leurs jetons.</p>
          <div className="mt-4 text-xs text-zinc-500">Prochain round bientôt…</div>
        </div>
      )}
    </div>
  );
}
