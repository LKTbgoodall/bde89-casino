import React, { useContext } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function BlindTest() {
  const { player, games, updateGame } = useContext(AppContext);
  const [betAmount, setBetAmount] = React.useState(5);

  const bt = games.blindtest ?? { state: 'waiting', pool: 0, bets: [], buzzerActive: false, firstBuzzer: null };
  const myBet = bt.bets?.find(b => b.playerId === player.id);
  const hasBuzzed = bt.buzzers?.find(b => b.id === player.id);
  const amIFirst = bt.firstBuzzer?.id === player.id;

  const placeBet = async () => {
    const amt = parseInt(betAmount);
    if (amt < 2 || amt > 20) return alert('Mise entre 2 et 20 🪙');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = data.state;
    if (s.bets?.find(b => b.playerId === player.id)) return;
    s.bets = s.bets ?? [];
    s.bets.push({ playerId: player.id, playerName: player.name, amount: amt });
    s.pool = (s.pool ?? 0) + amt;
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('blindtest', s);
  };

  const buzz = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = data.state;
    if (!s.buzzerActive) return;
    s.buzzers = s.buzzers ?? [];
    if (s.buzzers.find(b => b.id === player.id)) return;
    s.buzzers.push({ id: player.id, name: player.name, time: Date.now() });
    if (!s.firstBuzzer) {
      s.firstBuzzer = { id: player.id, name: player.name };
      s.state = 'locked';
      s.buzzerActive = false;
    }
    await updateGame('blindtest', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center text-fuchsia-400">🎵 Blind Test</h1>

      <div className="glass-card p-5 text-center">
        <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-2">Cagnotte</div>
        <div className="text-4xl font-mono font-black text-amber-400">{bt.pool ?? 0} 🪙</div>
      </div>

      {(bt.state === 'waiting' || !bt.state) && (
        <div className="glass p-8 text-center text-zinc-400 rounded-xl">
          <div className="text-4xl mb-3">🎵</div>
          <p>En attente du prochain round…</p>
        </div>
      )}

      {bt.state === 'betting' && (
        <div className="glass-card p-6 border-t-4 border-fuchsia-500">
          <h3 className="text-center font-bold mb-5">Place ta mise AVANT d'écouter la musique !</h3>
          {!myBet ? (
            <>
              <div className="flex gap-3 mb-5">
                {[2, 5, 10, 20].map(v => (
                  <button key={v} onClick={() => setBetAmount(v)} className={`flex-1 py-4 rounded-xl border font-bold text-sm touch-manipulation ${betAmount === v ? 'bg-fuchsia-600/30 border-fuchsia-500 text-fuchsia-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{v}🪙</button>
                ))}
              </div>
              <button onClick={placeBet} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 py-5 rounded-xl font-bold text-xl touch-manipulation">
                Miser {betAmount} 🪙
              </button>
              <p className="text-xs text-zinc-500 mt-3 text-center">Tu peux passer si tu ne connais pas le style !</p>
            </>
          ) : (
            <div className="text-center bg-fuchsia-900/20 border border-fuchsia-500/30 p-5 rounded-xl">
              <p className="font-bold text-fuchsia-400">Mise de {myBet.amount} 🪙 enregistrée !</p>
              <p className="text-sm text-zinc-400 mt-2 animate-pulse">Attends la musique…</p>
            </div>
          )}
        </div>
      )}

      {bt.state === 'buzzing' && (
        <div className="text-center py-8">
          {!myBet ? (
            <p className="text-zinc-500 italic">Tu n'as pas misé pour ce round.</p>
          ) : !hasBuzzed ? (
            <button
              onClick={buzz}
              className="w-48 h-48 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-3xl shadow-[0_0_50px_rgba(225,29,72,0.8)] border-4 border-rose-400 transition-transform active:scale-90 active:shadow-none touch-manipulation"
            >
              BUZZ !
            </button>
          ) : (
            <div className="text-zinc-400 animate-pulse mt-12">Buzzer enregistré…</div>
          )}
        </div>
      )}

      {bt.state === 'locked' && (
        <div className="glass-card p-8 text-center border border-fuchsia-500/50">
          <h2 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-4">Premier à buzzer !</h2>
          <div className={`text-4xl font-black mb-4 ${amIFirst ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-fuchsia-400'}`}>
            {bt.firstBuzzer?.name}
          </div>
          {amIFirst ? (
            <p className="text-lg text-emerald-300 font-bold">Donne ta réponse à haute voix !</p>
          ) : (
            <p className="text-zinc-400">Écoute sa réponse…</p>
          )}
        </div>
      )}
    </div>
  );
}
