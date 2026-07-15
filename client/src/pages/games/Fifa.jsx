import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function Fifa() {
  const { player, games } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(5);
  const [spectatorBetAmount, setSpectatorBetAmount] = useState(2);
  const [spectatorBetOn, setSpectatorBetOn] = useState(null);

  const fifa = games.fifa || { queue: [], currentMatch: null, spectators: [] };
  const current = fifa.currentMatch;
  
  const inQueue = fifa.queue?.find(x => x.id === player.id);
  const isPlaying = current && (current.player1 === player.id || current.player2 === player.id);
  const isPlayer1 = current && current.player1 === player.id;
  const isPlayer2 = current && current.player2 === player.id;

  const joinQueue = () => {
    socket.emit('fifa_join_queue', (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const confirmMatch = () => {
    socket.emit('fifa_confirm', { bet: parseInt(betAmount) }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const placeSpectatorBet = () => {
    if (!spectatorBetOn) return alert('Choisis un joueur !');
    socket.emit('fifa_spectator_bet', { amount: parseInt(spectatorBetAmount), betOnId: spectatorBetOn }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const submitScore = (winnerId) => {
    socket.emit('fifa_submit_score', { winnerId }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const amISpectatorBettor = current && fifa.spectators?.find(x => x.id === player.id);

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2">🎮 FIFA 1v1</h1>
      
      {!current && (
        <div className="glass-card p-6 text-center">
          <p className="text-zinc-400 mb-4">Aucun match en cours.</p>
          {!inQueue ? (
            <button onClick={joinQueue} className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-xl font-bold text-lg touch-manipulation w-full sm:w-auto">
              Rejoindre la file d'attente
            </button>
          ) : (
            <div className="text-rose-400 animate-pulse font-medium">Vous êtes dans la file d'attente ({fifa.queue.findIndex(x=>x.id===player.id)+1}e position)...</div>
          )}
        </div>
      )}

      {current && (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center flex-1">
              <div className="text-2xl font-black text-blue-400">{current.p1Name}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {current.p1Ready ? <span className="text-emerald-400">Prêt ({current.p1Bet}🪙)</span> : <span className="text-amber-500 animate-pulse">En attente...</span>}
              </div>
            </div>
            <div className="text-4xl font-black text-zinc-700 mx-4">VS</div>
            <div className="text-center flex-1">
              <div className="text-2xl font-black text-red-400">{current.p2Name}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {current.p2Ready ? <span className="text-emerald-400">Prêt ({current.p2Bet}🪙)</span> : <span className="text-amber-500 animate-pulse">En attente...</span>}
              </div>
            </div>
          </div>

          <div className="text-center bg-zinc-800/50 rounded-lg p-3 mb-6 border border-zinc-700/50">
            <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Cagnotte Totale</span>
            <span className="text-3xl font-mono text-rose-400">{current.pool} 🪙</span>
          </div>

          {/* Player Actions */}
          {isPlaying && !current.matchStarted && (
            <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
              <h3 className="font-bold mb-3">Ton match est prêt !</h3>
              {((isPlayer1 && !current.p1Ready) || (isPlayer2 && !current.p2Ready)) ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-sm text-zinc-400">Mise (5 - 30 max 50% de tes jetons)</label>
                    <input 
                      type="range" min="5" max={Math.min(30, Math.max(5, Math.floor(player.tokens/2)))} 
                      value={betAmount} onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full accent-rose-500 mt-2"
                    />
                    <div className="text-center text-xl font-bold text-rose-400">{betAmount} 🪙</div>
                  </div>
                  <button onClick={confirmMatch} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold shadow-lg shadow-emerald-500/20">
                    Je suis là & je mise
                  </button>
                </div>
              ) : (
                 <div className="text-center text-emerald-400">En attente de l'adversaire...</div>
              )}
            </div>
          )}

          {isPlaying && current.matchStarted && (
            <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 text-center">
              <h3 className="font-bold mb-4 text-rose-400 animate-pulse">MATCH EN COURS ⚽</h3>
              <p className="text-sm text-zinc-400 mb-6">Jouez votre match de 4 min. Une fois terminé, déclarez le gagnant.</p>
              
              {((isPlayer1 && !current.p1Vote) || (isPlayer2 && !current.p2Vote)) ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => submitScore(current.player1)} className="flex-1 bg-blue-600/20 border border-blue-500 hover:bg-blue-600/40 py-2 rounded text-blue-400 font-bold">
                    Victoire {current.p1Name}
                  </button>
                  <button onClick={() => submitScore(current.player2)} className="flex-1 bg-red-600/20 border border-red-500 hover:bg-red-600/40 py-2 rounded text-red-400 font-bold">
                    Victoire {current.p2Name}
                  </button>
                </div>
              ) : (
                <div className="text-amber-400">En attente de la validation de l'adversaire...</div>
              )}
            </div>
          )}

          {/* Spectator Actions */}
          {!isPlaying && !current.matchStarted && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h3 className="font-bold mb-2 text-sm text-zinc-400">Parier sur ce match (2-15🪙)</h3>
              {amISpectatorBettor ? (
                <div className="text-emerald-400 text-sm">Pari enregistré !</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      onClick={() => setSpectatorBetOn(current.player1)}
                      className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${spectatorBetOn === current.player1 ? 'bg-blue-600/30 border-blue-500 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                    >
                      {current.p1Name}
                    </button>
                    <button 
                      onClick={() => setSpectatorBetOn(current.player2)}
                      className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${spectatorBetOn === current.player2 ? 'bg-red-600/30 border-red-500 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                    >
                      {current.p2Name}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" min="2" max="15" 
                      value={spectatorBetAmount} onChange={(e) => setSpectatorBetAmount(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 w-20 text-center"
                    />
                    <button onClick={placeSpectatorBet} className="flex-1 bg-rose-600 hover:bg-rose-500 py-2 rounded font-bold text-sm">
                      Parier
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!isPlaying && current.matchStarted && (
            <div className="mt-4 pt-4 border-t border-zinc-800 text-center text-rose-500 animate-pulse font-bold text-sm">
              Match en cours... les paris sont fermés !
            </div>
          )}
        </div>
      )}

      {/* Queue display */}
      {fifa.queue?.length > 0 && (
        <div className="glass p-4 rounded-xl">
          <h3 className="font-bold text-zinc-300 mb-2">File d'attente ({fifa.queue.length})</h3>
          <div className="flex flex-wrap gap-2">
            {fifa.queue.map((q, i) => (
              <span key={q.id} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                {i+1}. {q.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
