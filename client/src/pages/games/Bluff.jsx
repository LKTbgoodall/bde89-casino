import React, { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function Bluff() {
  const { id: tableId } = useParams(); // bluff1 or bluff2
  const { player, games } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(2);
  const [choice, setChoice] = useState('A');

  const game = games[tableId] || { active: null, state: 'waiting', bets: [], pool: 0, truth: null };
  const isActive = game.active && game.active.id === player.id;
  const hasBet = game.bets?.find(b => b.id === player.id);

  const setTruth = () => {
    socket.emit('bluff_set_truth', { tableId, choice }, res => {
      if (!res.success) alert(res.error);
    });
  };

  const placeBet = () => {
    socket.emit('bluff_bet', { tableId, amount: parseInt(betAmount), choice }, res => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2">🃏 1 Vérité 2 Bluffs {tableId === 'bluff1' ? '(T1)' : '(T2)'}</h1>

      {game.state === 'waiting' && (
        <div className="glass p-8 text-center text-zinc-400">
          En attente qu'un admin sélectionne le prochain joueur...
        </div>
      )}

      {game.state === 'choosing_truth' && (
        <div className="glass-card p-6 text-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
          <h2 className="text-2xl font-bold text-indigo-400 mb-2">Joueur sélectionné : {game.active.name}</h2>
          {isActive ? (
            <div className="mt-6">
               <p className="mb-4 text-zinc-300">C'est à toi ! Sélectionne la lettre qui contient ta VRAIE anecdote (caché des autres).</p>
               <div className="flex gap-4 justify-center mb-6">
                 {['A', 'B', 'C'].map(letter => (
                   <button 
                     key={letter}
                     onClick={() => setChoice(letter)}
                     className={`w-16 h-16 rounded-xl text-2xl font-black transition-all ${choice === letter ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/50' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                   >
                     {letter}
                   </button>
                 ))}
               </div>
               <button onClick={setTruth} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/30">
                 Confirmer ma Vérité
               </button>
            </div>
          ) : (
            <p className="mt-4 text-amber-500 animate-pulse">Le joueur choisit sa vérité...</p>
          )}
        </div>
      )}

      {game.state === 'betting' && (
        <div className="glass-card p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-indigo-400 mb-1">{game.active.name} raconte ses anecdotes !</h2>
            <p className="text-sm text-zinc-400">Écoute attentivement et mise sur la vérité.</p>
          </div>

          <div className="flex justify-center gap-6 mb-8">
             <div className="text-center">
                <span className="block text-xs uppercase text-zinc-500 font-bold mb-1">Cagnotte</span>
                <span className="text-3xl font-mono text-amber-400 font-black">{game.pool} 🪙</span>
             </div>
          </div>

          {!isActive ? (
             hasBet ? (
               <div className="text-center p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 font-bold">
                 Pari enregistré ({hasBet.bet} 🪙 sur {hasBet.choice})
               </div>
             ) : (
               <div className="space-y-6">
                 <div className="flex gap-4 justify-center">
                   {['A', 'B', 'C'].map(letter => (
                     <button 
                       key={letter}
                       onClick={() => setChoice(letter)}
                       className={`w-16 h-16 rounded-xl text-2xl font-black transition-all ${choice === letter ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/50 scale-105' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                     >
                       {letter}
                     </button>
                   ))}
                 </div>
                 
                 <div className="flex flex-col items-center gap-2">
                    <label className="text-sm text-zinc-400">Mise (2-15 🪙)</label>
                    <div className="flex gap-2">
                       <input 
                         type="number" min="2" max="15" 
                         value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
                         className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-24 text-center font-mono text-lg"
                       />
                       <button onClick={placeBet} className="bg-gradient-to-r from-rose-600 to-fuchsia-600 font-bold px-6 rounded-lg text-white">
                         Parier
                       </button>
                    </div>
                 </div>
               </div>
             )
          ) : (
             <div className="text-center p-4 bg-zinc-800/50 rounded-lg text-zinc-400 italic">
               Les joueurs sont en train de parier. Dis-leur quand fermer les votes (via l'admin).
             </div>
          )}
        </div>
      )}

      {game.state === 'revealing' && (
        <div className="glass-card p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/20 animate-pulse"></div>
          <h2 className="text-2xl font-bold mb-4 relative z-10">La vérité était...</h2>
          <div className="text-7xl font-black text-white relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">
            {game.truth}
          </div>
        </div>
      )}
    </div>
  );
}
