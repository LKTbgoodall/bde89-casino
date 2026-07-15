import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function Undercover() {
  const { id: tableId } = useParams();
  const { player, games, updateGame, leaveAllQueues } = useContext(AppContext);
  const [mrWhiteGuess, setMrWhiteGuess] = React.useState('');

  const u = games[tableId] ?? { state: 'waiting', players: [], pool: 0 };
  const amIPlaying = u.players?.find(p => p.id === player.id);
  const alivePlayers = u.players?.filter(p => !p.eliminated) ?? [];
  const amIAlive = amIPlaying && !amIPlaying.eliminated;

  const joinGame = async () => {
    await leaveAllQueues();
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tableId).single();
    const s = data.state;
    if (s.state !== 'waiting') return alert('Partie déjà en cours');
    if (s.players.find(p => p.id === player.id)) return;
    s.players.push({ id: player.id, name: player.name, word: null, role: null, eliminated: false, votedFor: null });
    await updateGame(tableId, s);
  };

  const leaveGame = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tableId).single();
    const s = data.state;
    s.players = s.players.filter(p => p.id !== player.id);
    await updateGame(tableId, s);
  };

  const voteFor = async (targetId) => {
    if (!window.confirm('Éliminer ce joueur ?')) return;
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tableId).single();
    const s = data.state;
    s.players = s.players.map(p => p.id === player.id ? { ...p, votedFor: targetId } : p);
    // Check if everyone voted
    const alive = s.players.filter(p => !p.eliminated);
    if (alive.every(p => p.votedFor)) {
      // Count votes
      const counts = {};
      alive.forEach(p => { counts[p.votedFor] = (counts[p.votedFor] ?? 0) + 1; });
      const maxVotes = Math.max(...Object.values(counts));
      const eliminated = Object.keys(counts).find(id => counts[id] === maxVotes);
      s.players = s.players.map(p => p.id === eliminated ? { ...p, eliminated: true } : { ...p, votedFor: null });
      // Check win condition
      const remaining = s.players.filter(p => !p.eliminated);
      const undercoverLeft = remaining.filter(p => p.role === 'undercover').length;
      const mrWhiteLeft = remaining.filter(p => p.role === 'mrwhite').length;
      if (undercoverLeft === 0 && mrWhiteLeft === 0) { s.state = 'finished'; s.winnerRole = 'civil'; }
      else if (undercoverLeft >= remaining.filter(p => p.role === 'civil').length) { s.state = 'finished'; s.winnerRole = 'undercover'; }
      else if (s.players.find(p => p.id === eliminated && p.role === 'mrwhite')) { s.state = 'mrwhite_guess'; s.mrWhiteId = eliminated; }
    }
    await updateGame(tableId, s);
  };

  const submitGuess = async () => {
    // Admin judges — just clear state here
    alert('Attends que l\'admin valide ta réponse !');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center">🕵️ Imposteur {tableId === 'imposteur1' ? '(T1)' : '(T2)'}</h1>

      {u.state === 'waiting' && (
        <div className="glass-card p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Rejoindre la partie</h2>
          <p className="text-sm text-zinc-400 mb-6">Mise fixe : 10 🪙 par joueur (prélevée au lancement).</p>
          {!amIPlaying ? (
            <button onClick={joinGame} className="bg-rose-600 hover:bg-rose-500 active:bg-rose-400 font-bold px-8 py-4 rounded-xl transition-all text-lg touch-manipulation w-full">
              S'inscrire à la table
            </button>
          ) : (
            <div>
              <div className="text-emerald-400 font-bold mb-4">✓ Inscrit ! En attente du lancement…</div>
              <button onClick={leaveGame} className="text-zinc-500 text-sm underline touch-manipulation">Annuler</button>
            </div>
          )}
          <div className="mt-6">
            <h3 className="text-zinc-500 text-sm font-bold uppercase mb-3">Inscrits ({u.players.length})</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {u.players.map(p => (
                <span key={p.id} className="bg-zinc-800 px-3 py-1 rounded text-zinc-300 text-sm">{p.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {u.state === 'playing' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center bg-zinc-800/80 px-4 py-3 rounded-xl border border-zinc-700">
            <span className="text-sm text-zinc-400 uppercase font-bold tracking-wider">Cagnotte</span>
            <span className="text-xl font-mono text-amber-400 font-bold">{u.pool} 🪙</span>
          </div>

          {amIPlaying && (
            <div className="glass-card p-6 border-l-4 border-indigo-500 text-center">
              <span className="text-zinc-400 text-sm uppercase tracking-widest block mb-2">Ton mot secret</span>
              <div className="text-4xl font-black text-white bg-zinc-900 py-3 rounded-xl border border-zinc-700 mb-2">
                {amIPlaying.word || '???'}
              </div>
              {amIPlaying.eliminated && <div className="text-rose-500 font-bold mt-3">Tu es éliminé.</div>}
            </div>
          )}

          <div className="glass p-5 rounded-xl">
            <h3 className="font-bold text-center mb-2">Joueurs</h3>
            <p className="text-xs text-zinc-500 text-center mb-4">Cliquez sur un nom pour l'éliminer.</p>
            <div className="grid grid-cols-2 gap-3">
              {u.players.map(p => {
                const isElim = p.eliminated;
                const canVote = amIAlive && !isElim && p.id !== player.id && !amIPlaying?.votedFor;
                const iVotedFor = amIPlaying?.votedFor === p.id;
                return (
                  <div key={p.id}
                    onClick={() => canVote ? voteFor(p.id) : null}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all touch-manipulation ${isElim ? 'bg-rose-900/20 border-rose-500/20 opacity-50' : iVotedFor ? 'bg-rose-600/30 border-rose-500' : canVote ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 cursor-pointer' : 'bg-zinc-800 border-zinc-700'}`}>
                    <span className={`font-bold text-sm ${isElim ? 'line-through text-zinc-500' : ''}`}>{p.name}</span>
                    {isElim && <span className="text-[10px] font-black mt-1 uppercase text-rose-400">{p.role === 'mrwhite' ? 'Mr White' : p.role === 'undercover' ? 'Imposteur' : 'Civil'}</span>}
                    {!isElim && p.votedFor && <span className="text-[10px] text-emerald-400 mt-1">✓ voté</span>}
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
          <p className="text-zinc-300 mb-6">Mr White a une chance de deviner le mot des civils.</p>
          {amIPlaying?.id === u.mrWhiteId ? (
            <div className="space-y-4">
              <input type="text" value={mrWhiteGuess} onChange={e => setMrWhiteGuess(e.target.value)} placeholder="Le mot des civils est…" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center text-xl font-bold" />
              <button onClick={submitGuess} className="w-full bg-white text-zinc-900 font-black py-4 rounded-xl hover:bg-zinc-200 touch-manipulation">Tenter ma chance</button>
            </div>
          ) : (
            <div className="animate-pulse text-amber-400 font-bold">En attente de la tentative de Mr White…</div>
          )}
        </div>
      )}

      {u.state === 'finished' && (
        <div className="glass-card p-8 text-center">
          <h2 className="text-3xl font-black mb-2">Partie Terminée !</h2>
          <div className="text-xl font-bold mb-4 text-amber-400">
            Victoire des {u.winnerRole === 'civil' ? 'Civils' : u.winnerRole === 'undercover' ? 'Imposteurs' : 'Mr White'} !
          </div>
          <p className="text-zinc-400 text-sm">Mot des civils : <span className="font-bold text-white">{u.majorityWord}</span></p>
          {u.undercoverWord && <p className="text-zinc-400 text-sm">Mot des imposteurs : <span className="font-bold text-white">{u.undercoverWord}</span></p>}
        </div>
      )}
    </div>
  );
}
