import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Bluff() {
  const { id: tableId } = useParams();
  const { player, games, updateGame } = useContext(AppContext);
  const [betAmount, setBetAmount] = React.useState(5);

  const b = games[tableId] ?? { state: 'waiting', active: null, bets: [], pool: 0 };
  const myBet = b.bets?.find(bet => bet.playerId === player.id);

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
      <h1 className="text-3xl font-bold text-center">🃏 1 Vérité 2 Bluffs</h1>
      <p className="text-center text-zinc-400 text-sm">Table {tableId === 'bluff1' ? '1' : '2'}</p>

      <div className="glass-card p-5 text-center">
        <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2">Cagnotte</div>
        <div className="text-4xl font-mono font-black text-amber-400">{b.pool ?? 0} 🪙</div>
      </div>

      {b.state === 'waiting' && (
        <div className="glass p-8 text-center text-zinc-400 rounded-xl">
          <div className="text-4xl mb-4">😴</div>
          <p>En attente du prochain round…</p>
          <p className="text-sm mt-2 text-zinc-500">L'animateur désigne quelqu'un bientôt !</p>
        </div>
      )}

      {b.state === 'betting' && b.active && (
        <div className="glass-card p-6 border-t-4 border-amber-500">
          <div className="text-center mb-6">
            <span className="text-zinc-400 text-sm block mb-2">C'est à</span>
            <span className="text-3xl font-black text-amber-400">{b.active.name}</span>
            <span className="text-zinc-400 text-sm block mt-1">de raconter ses 3 histoires !</span>
          </div>

          {!myBet ? (
            <>
              <p className="text-center text-zinc-400 mb-5 text-sm">
                Écoute les 3 histoires, puis mise sur celle que tu penses être <strong className="text-white">vraie</strong>.
              </p>
              <div className="flex gap-3 mb-5">
                {[2, 5, 10, 15].map(v => (
                  <button key={v} onClick={() => setBetAmount(v)} className={`flex-1 py-3 rounded-xl border font-bold text-sm touch-manipulation ${betAmount === v ? 'bg-amber-600/30 border-amber-500 text-amber-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{v}🪙</button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => placeBet(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 py-4 rounded-xl font-bold text-lg touch-manipulation">
                  ✅ Miser {betAmount}🪙 sur la Vérité
                </button>
                <button onClick={() => placeBet(false)} className="w-full bg-zinc-600 hover:bg-zinc-500 py-3 rounded-xl font-bold text-base touch-manipulation">
                  🤡 Miser {betAmount}🪙 sur un Bluff
                </button>
              </div>
            </>
          ) : (
            <div className="text-center bg-zinc-800/80 p-6 rounded-xl border border-zinc-700">
              <div className="text-2xl mb-2">{myBet.isTruth ? '✅' : '🤡'}</div>
              <p className="font-bold text-zinc-200">Tu as misé <span className="text-amber-400">{myBet.amount}🪙</span> sur {myBet.isTruth ? 'la Vérité' : 'un Bluff'}</p>
              <p className="text-zinc-500 text-sm mt-3 animate-pulse">En attente des autres…</p>
              <div className="mt-3 text-xs text-zinc-400">{b.bets?.length} pari(s) enregistré(s)</div>
            </div>
          )}
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
