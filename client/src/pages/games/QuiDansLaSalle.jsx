import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function QuiDansLaSalle() {
  const { player, games } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(2);
  const [percent, setPercent] = useState(50);
  const [isMe, setIsMe] = useState(null); // true or false

  const q = games.quidanslasalle || { status: 'waiting', question: null, pool: 0, answers: {} };
  const myAnswer = q.answers[player.id];

  const submitAnswer = () => {
    if (isMe === null) return alert('Choisis si ça te correspond ou non !');
    socket.emit('q_submit', { bet: parseInt(betAmount), percent: parseInt(percent), isMe }, res => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2 text-center text-teal-400">🤔 Qui dans la salle ?</h1>

      {q.status === 'waiting' && (
        <div className="glass p-8 text-center text-zinc-400 mt-8">
          <p>En attente de la prochaine question...</p>
        </div>
      )}

      {q.status === 'betting' && (
        <div className="glass-card p-6 border-t-4 border-teal-500 relative overflow-hidden">
           <div className="text-center mb-8 relative z-10">
             <span className="text-teal-400 font-bold uppercase tracking-widest text-xs mb-2 block">Question en cours</span>
             <h2 className="text-2xl font-black text-white px-4 py-2 bg-zinc-800/80 rounded-lg inline-block border border-zinc-700">
               {q.question}
             </h2>
           </div>

           {!myAnswer ? (
             <div className="space-y-8 relative z-10">
                <div>
                  <h3 className="font-bold text-center mb-3">1. Est-ce que ça te correspond ?</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsMe(true)}
                      className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${isMe === true ? 'bg-teal-600/30 border-teal-500 text-teal-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                    >
                      Oui, c'est moi
                    </button>
                    <button 
                      onClick={() => setIsMe(false)}
                      className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${isMe === false ? 'bg-rose-600/30 border-rose-500 text-rose-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                    >
                      Non, pas moi
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-center mb-1">2. Estime le % de "Oui" dans la salle</h3>
                  <div className="text-center text-4xl font-black text-teal-400 mb-2">{percent}%</div>
                  <input 
                    type="range" min="0" max="100" 
                    value={percent} onChange={e => setPercent(e.target.value)}
                    className="w-full accent-teal-500"
                  />
                </div>

                <div>
                  <h3 className="font-bold text-center mb-3">3. Ta mise (2-15🪙)</h3>
                  <div className="flex justify-center gap-2">
                     <input 
                       type="number" min="2" max="15" 
                       value={betAmount} onChange={e => setBetAmount(e.target.value)}
                       className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 w-24 text-center font-mono text-xl"
                     />
                  </div>
                </div>

                <button onClick={submitAnswer} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 active:scale-[0.98]">
                  Verrouiller ma réponse
                </button>
             </div>
           ) : (
             <div className="text-center p-6 bg-teal-900/30 rounded-xl border border-teal-500/30">
                <p className="text-teal-400 font-bold text-lg mb-2">Réponse enregistrée !</p>
                <p className="text-zinc-300">Ton statut : <span className="font-bold">{myAnswer.isMe ? 'Oui' : 'Non'}</span></p>
                <p className="text-zinc-300">Ton estimation : <span className="font-bold">{myAnswer.percent}%</span></p>
                <p className="text-zinc-400 text-sm mt-4 italic">Attends que tout le monde ait voté...</p>
             </div>
           )}
        </div>
      )}

      {q.status === 'revealed' && (
        <div className="glass-card p-8 text-center border border-teal-500">
           <h2 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-4">Résultat</h2>
           <div className="text-6xl font-black text-white mb-6 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]">
             {q.truePercent}%
           </div>
           <p className="text-lg text-zinc-300 mb-4">de la salle a répondu "Oui" !</p>
           
           <div className="bg-zinc-800/50 p-4 rounded-lg mt-6">
              <h3 className="font-bold text-teal-400 mb-2">Gagnants (plus proches)</h3>
              {q.winners?.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {q.winners.map(wId => {
                    const ans = q.answers[wId];
                    return (
                      <span key={wId} className="bg-zinc-900 px-3 py-1 rounded-full text-sm font-medium border border-zinc-700">
                        {ans?.name} ({ans?.percent}%)
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-zinc-500">Aucun gagnant</p>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
