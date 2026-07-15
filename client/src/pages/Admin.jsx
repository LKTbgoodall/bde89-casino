import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { socket } from '../socket';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { player, games, leaderboard } = useContext(AppContext);
  const navigate = useNavigate();
  
  // Game admin states
  const [qQuestion, setQQuestion] = useState('');
  const [uWords, setUWords] = useState({ maj: 'Chien', und: 'Chat', count: 1, mrWhite: true });

  if (!player?.isAdmin) {
    return <div className="text-center p-10 text-rose-500 font-bold">Accès Refusé</div>;
  }

  const resetTable = (tableId) => {
    if(window.confirm(`Reset complet de la table ${tableId} ?`)) {
      socket.emit('u_admin_reset', { tableId });
      // We can reuse this generic reset for others if we add it in backend, 
      // but for now we only explicitly added reset for undercover. 
    }
  };

  const addTokens = (playerId, amount) => {
    socket.emit('admin_update_tokens', { targetPlayerId: playerId, amount }, res => {
      if(res.success) alert(`Succès : ${amount} jetons`);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <header className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-3xl font-black text-rose-500">Dashboard BDE</h1>
           <p className="text-zinc-400">Contrôle de toutes les tables.</p>
        </div>
        <button onClick={() => navigate('/screen')} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg font-bold text-sm border border-zinc-600">
           📺 Ouvrir Grand Écran
        </button>
      </header>

      {/* QUICK ACTIONS */}
      <section className="glass p-6 rounded-2xl">
        <h2 className="font-bold text-xl mb-4">Gestion des Joueurs (Top 10)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {leaderboard.slice(0, 10).map(p => (
            <div key={p.id} className="flex justify-between items-center bg-zinc-800 p-2 rounded text-sm">
              <span className="truncate flex-1">{p.name} ({p.tokens}🪙)</span>
              <div className="flex gap-1">
                <button onClick={() => addTokens(p.id, 10)} className="bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-600/50">+10</button>
                <button onClick={() => addTokens(p.id, 50)} className="bg-emerald-600/30 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-600/50">+50</button>
                <button onClick={() => addTokens(p.id, -10)} className="bg-rose-600/30 text-rose-400 px-2 py-1 rounded hover:bg-rose-600/50">-10</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BABY FOOT */}
        <div className="glass-card p-5 border-t-4 border-amber-500">
          <h2 className="font-bold mb-2 text-amber-500">⚽ Baby Foot</h2>
          <p className="text-xs text-zinc-400 mb-4">Statut: {games.babyfoot?.status}</p>
          <button 
            onClick={() => socket.emit('babyfoot_admin_start')}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2 rounded text-sm font-bold mb-2"
          >
            Forcer le lancement du match (sans attendre 8)
          </button>
        </div>

        {/* BLUFF */}
        <div className="glass-card p-5 border-t-4 border-indigo-500">
          <h2 className="font-bold mb-2 text-indigo-400">🃏 1 Vérité 2 Bluffs</h2>
          {['bluff1', 'bluff2'].map(tid => {
            const game = games[tid];
            return (
              <div key={tid} className="mb-4 bg-zinc-800/50 p-3 rounded border border-zinc-700/50">
                <h3 className="font-bold text-sm mb-2 uppercase">{tid}</h3>
                <p className="text-xs text-zinc-400 mb-2">Statut: {game?.state} {game?.active ? `(${game.active.name})` : ''}</p>
                {game?.state === 'waiting' && (
                   <div className="flex gap-2 mb-2">
                     <select id={`select_${tid}`} className="bg-zinc-900 border border-zinc-700 text-xs p-1 flex-1">
                       {leaderboard.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                     <button onClick={() => socket.emit('bluff_set_active', { tableId: tid, targetPlayerId: document.getElementById(`select_${tid}`).value })} className="bg-indigo-600 px-2 py-1 rounded text-xs">
                       Désigner
                     </button>
                   </div>
                )}
                {game?.state === 'betting' && (
                  <button onClick={() => socket.emit('bluff_reveal', { tableId: tid })} className="w-full bg-indigo-600 py-1 rounded text-xs font-bold mt-2">
                    Fermer paris & Révéler
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* BLIND TEST */}
        <div className="glass-card p-5 border-t-4 border-fuchsia-500">
          <h2 className="font-bold mb-2 text-fuchsia-400">🎵 Blind Test</h2>
          <p className="text-xs text-zinc-400 mb-4">Statut: {games.blindtest?.state} | Cagnotte: {games.blindtest?.pool}🪙</p>
          
          <div className="space-y-2">
            <button onClick={() => socket.emit('bt_admin_start_round')} className="w-full bg-zinc-700 hover:bg-zinc-600 py-2 rounded text-sm font-bold">1. Nouveau Round (Prises de paris)</button>
            <button onClick={() => socket.emit('bt_admin_open_buzzer')} className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded text-sm font-bold">2. Ouvrir le Buzzer (Lancer musique)</button>
            
            {games.blindtest?.state === 'locked' && (
              <div className="mt-4 border-t border-zinc-700 pt-4">
                <p className="text-sm mb-2 text-center">Buzzer: <strong className="text-fuchsia-400">{games.blindtest.firstBuzzer?.name}</strong></p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => socket.emit('bt_admin_resolve', { result: 'full' })} className="bg-emerald-600 py-1 rounded text-xs font-bold">✅ Titre + Artiste (100%)</button>
                  <button onClick={() => socket.emit('bt_admin_resolve', { result: 'half' })} className="bg-emerald-600/50 border border-emerald-500 py-1 rounded text-xs font-bold">🎵 Titre OU Artiste (50%)</button>
                  <button onClick={() => socket.emit('bt_admin_resolve', { result: 'wrong' })} className="bg-rose-600 py-1 rounded text-xs font-bold">❌ Faux (Rouvrir)</button>
                  <button onClick={() => socket.emit('bt_admin_resolve', { result: 'refund' })} className="bg-zinc-600 py-1 rounded text-xs font-bold">🔄 Personne n'a trouvé</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QUI DANS LA SALLE */}
        <div className="glass-card p-5 border-t-4 border-teal-500">
          <h2 className="font-bold mb-2 text-teal-400">🤔 Qui dans la salle</h2>
          <p className="text-xs text-zinc-400 mb-4">Statut: {games.quidanslasalle?.status} | Réponses: {Object.keys(games.quidanslasalle?.answers || {}).length}</p>
          
          {games.quidanslasalle?.status === 'waiting' || games.quidanslasalle?.status === 'revealed' ? (
             <div className="flex gap-2">
               <input type="text" placeholder="Question..." value={qQuestion} onChange={e=>setQQuestion(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 text-xs flex-1" />
               <button onClick={() => socket.emit('q_admin_start', { question: qQuestion })} className="bg-teal-600 px-3 rounded text-xs font-bold">Lancer</button>
             </div>
          ) : (
             <button onClick={() => socket.emit('q_admin_reveal')} className="w-full bg-teal-600 py-2 rounded text-sm font-bold">Fermer & Révéler</button>
          )}
        </div>

        {/* IMPOSTEUR */}
        <div className="glass-card p-5 border-t-4 border-white md:col-span-2">
          <h2 className="font-bold mb-2 text-white">🕵️ Imposteur</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['imposteur1', 'imposteur2'].map(tid => {
              const game = games[tid];
              return (
                <div key={tid} className="bg-zinc-800/50 p-4 rounded border border-zinc-700/50">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-sm uppercase">{tid}</h3>
                     <span className="text-xs text-zinc-400">{game?.state} | {game?.players?.length} joueurs</span>
                  </div>
                  
                  {game?.state === 'waiting' && (
                    <div className="space-y-2 mb-3">
                      <input type="text" placeholder="Mot Majorité" value={uWords.maj} onChange={e=>setUWords({...uWords, maj: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-xs" />
                      <input type="text" placeholder="Mot Imposteur" value={uWords.und} onChange={e=>setUWords({...uWords, und: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-xs" />
                      <div className="flex gap-2 items-center text-xs text-zinc-300">
                        <label>Nb Imposteurs:</label>
                        <input type="number" min="1" max="5" value={uWords.count} onChange={e=>setUWords({...uWords, count: parseInt(e.target.value)})} className="w-12 bg-zinc-900 border border-zinc-700 p-1 rounded" />
                        <label className="flex items-center gap-1"><input type="checkbox" checked={uWords.mrWhite} onChange={e=>setUWords({...uWords, mrWhite: e.target.checked})} /> Mr White?</label>
                      </div>
                      <button onClick={() => socket.emit('u_admin_start', { tableId: tid, majorityWord: uWords.maj, undercoverWord: uWords.und, undercoverCount: uWords.count, hasMrWhite: uWords.mrWhite })} className="w-full bg-white text-zinc-900 py-1 rounded text-xs font-bold mt-2">
                        Démarrer (Prélever mises)
                      </button>
                    </div>
                  )}

                  {game?.state === 'playing' && (
                    <div className="text-xs text-zinc-300">
                       <p className="mb-2"><strong>Mots:</strong> {game.majorityWord} vs {game.undercoverWord}</p>
                       <ul className="space-y-1 mb-2">
                         {game.players.map(p => (
                           <li key={p.id} className={p.eliminated ? 'line-through text-zinc-500' : ''}>
                             {p.name} - <span className={p.role==='civil'?'text-blue-400':p.role==='undercover'?'text-red-400':'text-white font-bold'}>{p.role}</span>
                           </li>
                         ))}
                       </ul>
                    </div>
                  )}

                  {game?.state === 'mrwhite_guess' && (
                    <div className="p-2 border border-amber-500 bg-amber-500/10 rounded mt-2">
                      <p className="text-xs text-amber-400 font-bold mb-2">Arbitrer devinette Mr White</p>
                      <div className="flex gap-2">
                        <button onClick={() => socket.emit('u_admin_judge_mrwhite', { tableId: tid, isCorrect: true })} className="flex-1 bg-emerald-600 text-xs py-1 rounded">✅ Correct</button>
                        <button onClick={() => socket.emit('u_admin_judge_mrwhite', { tableId: tid, isCorrect: false })} className="flex-1 bg-rose-600 text-xs py-1 rounded">❌ Faux</button>
                      </div>
                    </div>
                  )}

                  <button onClick={() => resetTable(tid)} className="text-rose-500 text-[10px] uppercase font-bold underline mt-2">Force Reset</button>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
