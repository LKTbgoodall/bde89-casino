import React, { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../App';
import { socket } from '../../socket';

export default function Undercover() {
  const { id: tableId } = useParams(); // imposteur1 or imposteur2
  const { player, games } = useContext(AppContext);
  const [mrWhiteGuess, setMrWhiteGuess] = useState('');

  const u = games[tableId] || { state: 'waiting', players: [], pool: 0, turnOrder: [] };
  const amIPlaying = u.players?.find(x => x.id === player.id);
  const myPlayerInfo = amIPlaying;

  const joinGame = () => {
    socket.emit('u_join', { tableId }, res => {
      if (!res.success) alert(res.error);
    });
  };

  const leaveGame = () => {
    socket.emit('u_leave', { tableId }, res => {
      if (!res.success) alert(res.error);
    });
  };

  const voteFor = (targetId) => {
    if (window.confirm('Es-tu sûr de vouloir éliminer ce joueur ?')) {
      socket.emit('u_vote', { tableId, targetId }, res => {
        if (!res.success) alert(res.error);
      });
    }
  };

  const submitGuess = () => {
    socket.emit('u_mrwhite_guess', { tableId, guess: mrWhiteGuess }, res => {
      if (!res.success) alert(res.error);
    });
  };

  // Turn logic
  const alivePlayers = u.players?.filter(p => !p.eliminated) || [];
  const amIAlive = myPlayerInfo && !myPlayerInfo.eliminated;
  const allVoted = alivePlayers.length > 0 && alivePlayers.every(p => p.votedFor);

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold mb-2 text-center">🕵️ Imposteur {tableId === 'imposteur1' ? '(T1)' : '(T2)'}</h1>

      {u.state === 'waiting' && (
        <div className="glass-card p-6 text-center">
           <h2 className="text-xl font-bold mb-4">Rejoindre la partie</h2>
           <p className="text-sm text-zinc-400 mb-6">Mise fixe : 10 🪙 par joueur (prélevée au lancement).</p>
           
           {!amIPlaying ? (
             <button onClick={joinGame} className="bg-rose-600 hover:bg-rose-500 active:bg-rose-400 font-bold px-8 py-4 rounded-xl transition-all text-lg touch-manipulation w-full sm:w-auto">
               S'inscrire à la table
             </button>
           ) : (
             <div>
               <div className="text-emerald-400 font-bold mb-4">Inscrit ! En attente du lancement par l'admin...</div>
               <button onClick={leaveGame} className="text-zinc-500 text-sm hover:text-white underline">Annuler</button>
             </div>
           )}

           <div className="mt-8">
             <h3 className="text-zinc-500 text-sm font-bold uppercase mb-3">Joueurs inscrits ({u.players.length})</h3>
             <div className="flex flex-wrap gap-2 justify-center">
               {u.players.map(p => (
                 <span key={p.id} className="bg-zinc-800 px-3 py-1 rounded text-zinc-300">
                   {p.name}
                 </span>
               ))}
             </div>
           </div>
        </div>
      )}

      {u.state === 'playing' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center bg-zinc-800/80 px-4 py-3 rounded-xl border border-zinc-700">
             <span className="text-sm text-zinc-400 uppercase font-bold tracking-wider">Cagnotte</span>
             <span className="text-xl font-mono text-amber-400 font-bold">{u.pool} 🪙</span>
           </div>

           {myPlayerInfo && (
             <div className="glass-card p-6 border-l-4 border-indigo-500 text-center">
               <span className="text-zinc-400 text-sm uppercase tracking-widest block mb-2">Ton mot secret</span>
               <div className="text-4xl font-black text-white bg-zinc-900 py-3 rounded-lg border border-zinc-700 mb-2">
                 {myPlayerInfo.word || '???'}
               </div>
               {myPlayerInfo.eliminated && (
                 <div className="text-rose-500 font-bold mt-4">Tu es éliminé. Tu ne peux plus voter.</div>
               )}
             </div>
           )}

           <div className="glass p-6 rounded-xl">
             <h3 className="font-bold text-center mb-4">Joueurs en lice</h3>
             <p className="text-xs text-zinc-500 text-center mb-6">Ordre de passage libre. Cliquez sur un nom pour l'éliminer une fois que tout le monde a parlé.</p>
             
             <div className="grid grid-cols-2 gap-3">
               {u.players.map(p => {
                 const isEliminated = p.eliminated;
                 const canVoteFor = amIAlive && !isEliminated && p.id !== player.id;
                 const iHaveVotedForThis = myPlayerInfo?.votedFor === p.id;
                 
                 return (
                   <div 
                     key={p.id}
                     onClick={() => canVoteFor && !myPlayerInfo.votedFor ? voteFor(p.id) : null}
                     className={`p-3 rounded-lg border flex flex-col items-center text-center transition-all ${
                       isEliminated 
                         ? 'bg-rose-900/20 border-rose-500/20 opacity-50 cursor-not-allowed'
                         : iHaveVotedForThis
                            ? 'bg-rose-600/30 border-rose-500 cursor-not-allowed'
                            : canVoteFor && !myPlayerInfo.votedFor
                               ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 cursor-pointer'
                               : 'bg-zinc-800 border-zinc-700 cursor-default'
                     }`}
                   >
                     <span className={`font-bold ${isEliminated ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{p.name}</span>
                     {isEliminated && (
                       <span className="text-xs font-black mt-1 uppercase text-rose-400">
                         {p.role === 'mrwhite' ? 'Mr White' : p.role === 'undercover' ? 'Imposteur' : 'Civil'}
                       </span>
                     )}
                     {!isEliminated && p.votedFor && (
                       <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> A voté
                       </span>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      )}

      {u.state === 'mrwhite_guess' && (
        <div className="glass-card p-6 text-center border-2 border-white/20">
          <h2 className="text-2xl font-black text-white mb-2">Alerte Mr White !</h2>
          <p className="text-zinc-300 mb-6">Mr White a été démasqué et éliminé. Il a maintenant une chance de deviner le mot des civils pour voler la victoire.</p>
          
          {myPlayerInfo?.id === u.mrWhiteId ? (
            <div className="space-y-4">
              <input 
                type="text" 
                value={mrWhiteGuess}
                onChange={e => setMrWhiteGuess(e.target.value)}
                placeholder="Le mot des civils est..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-center text-xl font-bold"
              />
              <button onClick={submitGuess} className="w-full bg-white text-zinc-900 font-black py-3 rounded-lg hover:bg-zinc-200">
                Tenter ma chance
              </button>
            </div>
          ) : (
            <div className="animate-pulse text-amber-400 font-bold">
              En attente de la tentative de Mr White...
            </div>
          )}
        </div>
      )}

      {u.state === 'finished' && (
        <div className="glass-card p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/10"></div>
          <h2 className="text-3xl font-black mb-2 relative z-10">Partie Terminée !</h2>
          <div className="text-xl font-bold mb-6 text-amber-400 relative z-10">
            Victoire des {u.winnerRole === 'civil' ? 'Civils' : u.winnerRole === 'undercover' ? 'Imposteurs' : 'Mr White'} !
          </div>
          <div className="text-zinc-400 text-sm relative z-10">Le mot des civils était : <span className="font-bold text-white">{u.majorityWord}</span></div>
          {u.undercoverWord && <div className="text-zinc-400 text-sm relative z-10">Le mot des imposteurs était : <span className="font-bold text-white">{u.undercoverWord}</span></div>}
          
          <p className="text-xs text-zinc-500 mt-8 relative z-10 italic">Retour au lobby dans quelques instants...</p>
        </div>
      )}
    </div>
  );
}
