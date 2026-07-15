import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function BlindTest() {
  const { player, games } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(2);

  const bt = games.blindtest || { state: 'waiting', pool: 0, bets: [], firstBuzzer: null, buzzers: [] };
  const hasBet = bt.bets?.find(b => b.id === player.id);
  const hasBuzzed = bt.buzzers?.find(b => b.id === player.id);
  const amIFirst = bt.firstBuzzer && bt.firstBuzzer.id === player.id;

  const placeBet = () => {
    socket.emit('bt_bet', { amount: parseInt(betAmount) }, res => {
      if (!res.success) alert(res.error);
    });
  };

  const buzz = () => {
    socket.emit('bt_buzz', { clientTime: Date.now() });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2 text-center text-fuchsia-400">🎵 Blind Test</h1>

      <div className="text-center bg-zinc-800/80 rounded-xl p-4 shadow-inner border border-zinc-700/50">
        <span className="text-zinc-500 uppercase text-xs font-black tracking-widest block mb-1">Cagnotte en jeu</span>
        <span className="text-4xl font-mono text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]">{bt.pool} 🪙</span>
      </div>

      {bt.state === 'waiting' && (
        <div className="glass p-8 text-center text-zinc-400 mt-8">
          <p>En attente du prochain extrait...</p>
        </div>
      )}

      {bt.state === 'betting' && (
        <div className="glass-card p-6 text-center border-t-4 border-t-amber-500">
          <h2 className="text-xl font-bold text-amber-400 mb-4 animate-pulse">Préparez-vous !</h2>
          {!hasBet ? (
            <div className="flex flex-col items-center gap-4">
               <p className="text-zinc-300">Misez pour participer à ce round (2-10 🪙)</p>
               <div className="flex gap-2">
                 <input 
                   type="number" min="2" max="10" 
                   value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
                   className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 w-24 text-center font-mono text-xl"
                 />
                 <button onClick={placeBet} className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-amber-500/20">
                   Miser
                 </button>
               </div>
               <p className="text-xs text-zinc-500 mt-2">Mise optionnelle. Tu peux passer ton tour si tu ne connais pas le style !</p>
            </div>
          ) : (
            <div className="text-emerald-400 font-bold p-4 bg-emerald-500/10 rounded-lg">
               Mise de {hasBet.bet} 🪙 enregistrée. Attends l'extrait !
            </div>
          )}
        </div>
      )}

      {bt.state === 'buzzing' && (
        <div className="text-center py-8">
          {!hasBet ? (
            <p className="text-zinc-500 italic">Tu n'as pas misé pour ce round.</p>
          ) : !hasBuzzed ? (
            <button 
              onClick={buzz}
              className="w-48 h-48 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-3xl shadow-[0_0_50px_rgba(225,29,72,0.8)] border-4 border-rose-400 transition-transform active:scale-90 active:shadow-none"
            >
              BUZZ !
            </button>
          ) : (
             <div className="text-zinc-400 animate-pulse mt-12">Buzzer enregistré, en attente des autres...</div>
          )}
        </div>
      )}

      {bt.state === 'locked' && (
        <div className="glass-card p-8 text-center border border-fuchsia-500/50">
          <h2 className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-4">Le premier à buzzer est...</h2>
          <div className={`text-4xl font-black mb-4 ${amIFirst ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-fuchsia-400'}`}>
            {bt.firstBuzzer?.name}
          </div>
          {amIFirst ? (
            <p className="text-lg text-emerald-300 font-bold">Donne ta réponse à haute voix !</p>
          ) : (
            <p className="text-zinc-400">Écoute sa réponse...</p>
          )}
        </div>
      )}
    </div>
  );
}
