import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function BabyFoot() {
  const { player, games } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(5);

  const bf = games.babyfoot || { left: [], right: [], status: 'waiting', pool: 0 };
  
  const myPlayerLeft = bf.left.find(x => x.id === player.id);
  const myPlayerRight = bf.right.find(x => x.id === player.id);
  const myPlayer = myPlayerLeft || myPlayerRight;
  const isPlaying = !!myPlayer;

  const joinTeam = (side) => {
    socket.emit('babyfoot_join', { side }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const placeBet = () => {
    socket.emit('babyfoot_bet', { amount: parseInt(betAmount) }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const submitVote = (winnerSide) => {
    socket.emit('babyfoot_submit_vote', { winnerSide }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2 text-center">⚽ Baby Foot 4v4</h1>
      
      {bf.status === 'betting' && !myPlayer?.bet && (
        <div className="bg-rose-500/20 border border-rose-500 p-4 rounded-xl text-center mb-6">
          <h3 className="font-bold text-rose-400 mb-2">Le match va commencer !</h3>
          <p className="text-sm mb-4">Saisis ta mise pour confirmer ta présence.</p>
          <div className="flex gap-2 justify-center items-center">
             <input 
               type="number" min="5" max="20" 
               value={betAmount} onChange={e => setBetAmount(e.target.value)}
               className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 w-24 text-center"
             />
             <button onClick={placeBet} className="bg-rose-600 hover:bg-rose-500 px-6 py-2 rounded font-bold">Miser</button>
          </div>
        </div>
      )}

      {bf.status === 'playing' && isPlaying && !myPlayer?.vote && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-xl text-center mb-6">
          <h3 className="font-bold text-emerald-400 mb-2 animate-pulse">Match en cours !</h3>
          <p className="text-sm text-zinc-300 mb-4">Une fois terminé, votez pour l'équipe gagnante (6 votes identiques requis).</p>
          <div className="flex gap-4">
             <button onClick={() => submitVote('left')} className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 py-3 rounded-lg border border-blue-500/50">
               Victoire Équipe Bleue
             </button>
             <button onClick={() => submitVote('right')} className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 py-3 rounded-lg border border-red-500/50">
               Victoire Équipe Rouge
             </button>
          </div>
        </div>
      )}

      {(bf.status !== 'waiting' || bf.pool > 0) && (
        <div className="text-center bg-zinc-800/50 rounded-lg p-3 mb-6 border border-zinc-700/50">
          <span className="text-zinc-400 uppercase text-xs font-bold tracking-widest block mb-1">Cagnotte Globale</span>
          <span className="text-3xl font-mono text-amber-400">{bf.pool} 🪙</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* LEFT TEAM */}
        <div className="glass-card p-4 border-t-4 border-t-blue-500 relative">
          <h2 className="font-bold text-blue-400 mb-4 text-center">Équipe Bleue ({bf.left.length}/4)</h2>
          <div className="space-y-2 min-h-[120px]">
            {bf.left.map(p => (
              <div key={p.id} className="bg-zinc-800/50 px-3 py-2 rounded flex justify-between items-center text-sm">
                <span>{p.name}</span>
                {p.bet > 0 && <span className="text-amber-400 font-mono text-xs">{p.bet}🪙</span>}
                {p.vote && <span className="text-emerald-400 text-xs">A voté</span>}
              </div>
            ))}
            {bf.left.length === 0 && <p className="text-zinc-500 text-sm text-center italic mt-4">Place libre</p>}
          </div>
          
          {bf.status === 'waiting' && !isPlaying && bf.left.length < 4 && (
            <button onClick={() => joinTeam('left')} className="w-full mt-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 py-2 rounded border border-blue-500/50 transition-colors">
              Rejoindre
            </button>
          )}
        </div>

        {/* RIGHT TEAM */}
        <div className="glass-card p-4 border-t-4 border-t-red-500 relative">
          <h2 className="font-bold text-red-400 mb-4 text-center">Équipe Rouge ({bf.right.length}/4)</h2>
          <div className="space-y-2 min-h-[120px]">
            {bf.right.map(p => (
              <div key={p.id} className="bg-zinc-800/50 px-3 py-2 rounded flex justify-between items-center text-sm">
                <span>{p.name}</span>
                {p.bet > 0 && <span className="text-amber-400 font-mono text-xs">{p.bet}🪙</span>}
                {p.vote && <span className="text-emerald-400 text-xs">A voté</span>}
              </div>
            ))}
            {bf.right.length === 0 && <p className="text-zinc-500 text-sm text-center italic mt-4">Place libre</p>}
          </div>

          {bf.status === 'waiting' && !isPlaying && bf.right.length < 4 && (
            <button onClick={() => joinTeam('right')} className="w-full mt-4 bg-red-600/20 hover:bg-red-600/40 text-red-300 py-2 rounded border border-red-500/50 transition-colors">
              Rejoindre
            </button>
          )}
        </div>
      </div>
      
      {bf.status === 'waiting' && (bf.left.length > 0 || bf.right.length > 0) && (
        <p className="text-center text-zinc-500 text-sm mt-6">En attente de 8 joueurs (ou lancement par un admin)...</p>
      )}
    </div>
  );
}
