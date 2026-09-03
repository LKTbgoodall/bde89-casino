import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const { player, games, leaderboard, updateGame } = useContext(AppContext);
  const [qQuestion, setQQuestion] = useState('');
  const [uWords, setUWords] = useState({ maj: '', und: '', count: 1, mrWhite: false });
  const [btSelectedPlayer, setBtSelectedPlayer] = useState(null);

  if (!player?.is_admin) {
    return <div className="text-center text-rose-500 mt-20 text-xl font-bold">Accès refusé</div>;
  }

  // --- Helpers ---
  const resetGame = async (gameId) => {
    const defaults = {
      fifa: { queue: [], currentMatch: null, spectators: [] },
      babyfoot: { left: [], right: [], status: 'waiting', votes: { left: 0, right: 0 }, pool: 0 },
      bluff1: { active: null, state: 'waiting', choices: [], queue: [] },
      bluff2: { active: null, state: 'waiting', choices: [], queue: [] },
      blindtest: { state: 'waiting', players: [] },
      quidanslasalle: { question: null, pool: 0, answers: {}, status: 'waiting' },
      imposteur1: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '', pool: 0 },
      imposteur2: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '', pool: 0 },
    };
    await updateGame(gameId, defaults[gameId]);
    await updateGame(gameId, defaults[gameId]);
  };

  const fifaAdminSubmitScore = async (winnerId) => {
    if (!window.confirm("Forcer la victoire pour ce joueur ?")) return;
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'fifa').single();
    const s = data.state;
    if (!s.currentMatch) return;

    const { data: wd } = await supabase.from('players').select('tokens').eq('id', winnerId).single();
    await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 20 }).eq('id', winnerId);

    if (s.spectators?.length > 0) {
      const winningSpecs = s.spectators.filter(sp => sp.betOn === winnerId);
      for (const spec of winningSpecs) {
        const { data: sd } = await supabase.from('players').select('tokens').eq('id', spec.id).single();
        await supabase.from('players').update({ tokens: (sd?.tokens ?? 0) + spec.amount * 2 }).eq('id', spec.id);
      }
    }
    s.currentMatch = null; s.spectators = [];
    await updateGame('fifa', s);
  };

  const bfAdminSubmitScore = async (winnerSide) => {
    if (!window.confirm("Forcer la victoire pour cette équipe ?")) return;
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.status !== 'playing') return;

    const winners = s[winnerSide];
    for (const w of winners) {
      const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
      await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 15 }).eq('id', w.id);
      
      if (s.spectatorBets?.length > 0) {
        const winningSpecs = s.spectatorBets.filter(b => b.betOn === winnerSide);
        for (const spec of winningSpecs) {
          const { data: sd } = await supabase.from('players').select('tokens').eq('id', spec.id).single();
          await supabase.from('players').update({ tokens: (sd?.tokens ?? 0) + spec.amount * 2 }).eq('id', spec.id);
        }
      }
    }
    s.left = []; s.right = []; s.status = 'waiting'; s.spectatorBets = []; s.spectatorPool = 0; s.conflict = false;
    await updateGame('babyfoot', s);
  };
  // --- BLUFF ---
  const bluffSetRandomActive = async (tid) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    if (!s.queue || s.queue.length === 0) return alert('Personne dans la file d\'attente !');
    
    const randomIndex = Math.floor(Math.random() * s.queue.length);
    const targetPlayer = s.queue[randomIndex];
    
    s.active = targetPlayer;
    s.state = 'betting';
    s.bets = [];
    s.pool = 0;
    s.queue = s.queue.filter(p => p.id !== targetPlayer.id);
    await updateGame(tid, s);
  };

  const bluffReveal = async (tid, truthWon) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    if (!s.choices) return;
    
    const correctChoice = truthWon ? 'vérité' : 'bluff';
    const winners = s.choices.filter(c => c.choice === correctChoice);
    
    if (winners.length > 0) {
      for (const w of winners) {
        const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
        await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + 5 }).eq('id', w.id);
      }
    }
    s.state = 'revealed';
    await updateGame(tid, s);
    setTimeout(() => resetGame(tid), 5000);
  };

  // --- BLIND TEST ---
  const btStartRound = async () => {
    const s = { state: 'joining', players: [] };
    await updateGame('blindtest', s);
    setBtSelectedPlayer(null);
  };
  const btStartPlaying = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = { ...data.state, state: 'playing' };
    await updateGame('blindtest', s);
    setBtSelectedPlayer(null);
  };
  const btResolve = async (result) => {
    const winnerId = btSelectedPlayer;
    if (!winnerId && result !== 'refund' && result !== 'wrong') return alert('Sélectionne un joueur !');
    
    if (result === 'full') {
      const winnerTokens = (await supabase.from('players').select('tokens').eq('id', winnerId).single()).data?.tokens ?? 0;
      await supabase.from('players').update({ tokens: winnerTokens + 10 }).eq('id', winnerId);
    } else if (result === 'half') {
      const winnerTokens = (await supabase.from('players').select('tokens').eq('id', winnerId).single()).data?.tokens ?? 0;
      await supabase.from('players').update({ tokens: winnerTokens + 5 }).eq('id', winnerId);
    } 
    
    // reset round
    await updateGame('blindtest', { state: 'waiting', players: [] });
    setBtSelectedPlayer(null);
  };

  // --- QUI DANS LA SALLE ---
  const qStart = async () => {
    if (!qQuestion.trim()) return alert('Saisis une question');
    const s = { question: qQuestion.trim(), status: 'betting', pool: 0, answers: {} };
    await updateGame('quidanslasalle', s);
    setQQuestion('');
  };
  const qReveal = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'quidanslasalle').single();
    const s = data.state;
    const answers = Object.values(s.answers ?? {});
    const yesPct = answers.length > 0 ? Math.round((answers.filter(a => a.isMe).length / answers.length) * 100) : 0;
    const diffs = answers.map(a => ({ ...a, diff: Math.abs(a.percent - yesPct) }));
    const minDiff = Math.min(...diffs.map(d => d.diff));
    const winners = diffs.filter(d => d.diff === minDiff).map(d => d.playerId);
    if (winners.length > 0 && s.pool > 0) {
      const share = Math.floor(s.pool / winners.length);
      for (const wId of winners) {
        const { data: wd } = await supabase.from('players').select('tokens').eq('id', wId).single();
        await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + share }).eq('id', wId);
      }
    }
    const na = {};
    Object.entries(s.answers ?? {}).forEach(([k, v]) => { na[k] = { ...v }; });
    await updateGame('quidanslasalle', { ...s, status: 'revealed', truePercent: yesPct, winners });
  };

  // --- BABYFOOT ---
  const bfStartMatch = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    if (s.left.length < 1 || s.right.length < 1) return alert('Pas assez de joueurs !');
    s.status = 'betting';
    await updateGame('babyfoot', s);
  };
  const bfStartPlaying = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'babyfoot').single();
    const s = data.state;
    s.status = 'playing';
    await updateGame('babyfoot', s);
  };

  // --- UNDERCOVER ---
  const uStart = async (tid) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    if (s.players.length < 3) return alert('Minimum 3 joueurs');
    if (!uWords.maj || !uWords.und) return alert('Saisis les deux mots');
    const count = Math.min(parseInt(uWords.count), Math.floor(s.players.length / 3));
    let pool = 0;
    const shuffled = [...s.players].sort(() => Math.random() - 0.5);
    let undercoverSet = new Set();
    let mrWhiteId = null;
    if (uWords.mrWhite && shuffled.length > count) {
      mrWhiteId = shuffled[count].id;
    }
    for (let i = 0; i < count; i++) undercoverSet.add(shuffled[i].id);
    s.players = s.players.map(p => {
      const role = undercoverSet.has(p.id) ? 'undercover' : p.id === mrWhiteId ? 'mrwhite' : 'civil';
      const word = role === 'undercover' ? uWords.und : role === 'mrwhite' ? '' : uWords.maj;
      return { ...p, role, word, eliminated: false, votedFor: null };
    });
    pool = s.players.length * 10;
    for (const p of s.players) {
      const { data: wd } = await supabase.from('players').select('tokens').eq('id', p.id).single();
      await supabase.from('players').update({ tokens: Math.max(0, (wd?.tokens ?? 0) - 10) }).eq('id', p.id);
    }
    s.state = 'playing';
    s.majorityWord = uWords.maj;
    s.undercoverWord = uWords.und;
    s.pool = pool;
    await updateGame(tid, s);
  };

  const uJudgeMrWhite = async (tid, isCorrect) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    if (isCorrect) {
      s.state = 'finished'; s.winnerRole = 'mrwhite';
    } else {
      s.state = 'finished'; s.winnerRole = 'civil';
    }
    if (s.pool > 0) {
      const winners = s.players.filter(p => {
        if (isCorrect) return p.role === 'mrwhite';
        return p.role === 'civil';
      });
      if (winners.length > 0) {
        const share = Math.floor(s.pool / winners.length);
        for (const w of winners) {
          const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.id).single();
          await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + share }).eq('id', w.id);
        }
      }
    }
    await updateGame(tid, s);
  };

  const cardClass = "glass-card p-5";
  const badgeClass = "text-xs bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded font-mono";

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-rose-500">🎛️ Admin BDE</h1>


      {/* FIFA */}
      <div className={`${cardClass} border-t-4 border-rose-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-rose-400">🎮 FIFA</h2>
          <span className={badgeClass}>File: {games.fifa?.queue?.length ?? 0} | {games.fifa?.currentMatch ? 'Match en cours' : 'Libre'}</span>
        </div>
        {games.fifa?.currentMatch?.matchStarted && (
          <div className="mb-3 p-3 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-2 font-bold uppercase">Arbitrer le match :</p>
            <div className="flex gap-2">
              <button onClick={() => fifaAdminSubmitScore(games.fifa.currentMatch.player1)} className="flex-1 bg-blue-600/50 hover:bg-blue-500 py-2 rounded text-xs font-bold touch-manipulation">Victoire {games.fifa.currentMatch.p1Name}</button>
              <button onClick={() => fifaAdminSubmitScore(games.fifa.currentMatch.player2)} className="flex-1 bg-red-600/50 hover:bg-red-500 py-2 rounded text-xs font-bold touch-manipulation">Victoire {games.fifa.currentMatch.p2Name}</button>
            </div>
          </div>
        )}
        <button onClick={() => resetGame('fifa')} className="w-full bg-rose-900/30 border border-rose-500/30 text-rose-400 text-xs py-2 rounded hover:bg-rose-900/50 touch-manipulation">⚠️ Reset</button>
      </div>

      {/* BABYFOOT */}
      <div className={`${cardClass} border-t-4 border-emerald-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-emerald-400">⚽ Baby Foot</h2>
          <span className={badgeClass}>{games.babyfoot?.status} | {(games.babyfoot?.left?.length ?? 0) + (games.babyfoot?.right?.length ?? 0)} joueurs</span>
        </div>
        {games.babyfoot?.status === 'playing' && (
          <div className="mb-3 p-3 bg-zinc-800 rounded border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-2 font-bold uppercase">Arbitrer le match :</p>
            <div className="flex gap-2">
              <button onClick={() => bfAdminSubmitScore('left')} className="flex-1 bg-blue-600/50 hover:bg-blue-500 py-2 rounded text-xs font-bold touch-manipulation">Victoire Bleue</button>
              <button onClick={() => bfAdminSubmitScore('right')} className="flex-1 bg-red-600/50 hover:bg-red-500 py-2 rounded text-xs font-bold touch-manipulation">Victoire Rouge</button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          {games.babyfoot?.status === 'waiting' && <button onClick={bfStartMatch} className="flex-1 bg-emerald-700 hover:bg-emerald-600 py-2 rounded text-xs font-bold touch-manipulation">Lancer les mises</button>}
          {games.babyfoot?.status === 'betting' && <button onClick={bfStartPlaying} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-xs font-bold touch-manipulation">Démarrer le match</button>}
          <button onClick={() => resetGame('babyfoot')} className="bg-rose-900/30 border border-rose-500/30 text-rose-400 text-xs px-3 py-2 rounded hover:bg-rose-900/50 touch-manipulation">Reset</button>
        </div>
      </div>

      {/* BLUFF */}
      <div className={`${cardClass} border-t-4 border-indigo-500`}>
        <h2 className="font-bold text-indigo-400 mb-4">🃏 1V1B</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['bluff1', 'bluff2'].map(tid => {
            const g = games[tid];
            return (
              <div key={tid} className="bg-zinc-800/50 p-3 rounded border border-zinc-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold uppercase">{tid}</span>
                  <span className={badgeClass}>{g?.state}</span>
                </div>
                {g?.state === 'waiting' && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-xs text-zinc-400">File d'attente ({g.queue?.length ?? 0}) : {g.queue?.map(q=>q.name).join(', ')}</p>
                    <button 
                      onClick={() => bluffSetRandomActive(tid)} 
                      disabled={!g.queue || g.queue.length === 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded text-xs font-bold touch-manipulation disabled:opacity-50">
                      🎲 Tirer au sort depuis la file
                    </button>
                  </div>
                )}
                {g?.state === 'betting' && (
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs text-zinc-400 mb-1">Sur scène : <strong className="text-white">{g.active?.name}</strong> | {g.choices?.length ?? 0} choix</p>
                    <button onClick={() => bluffReveal(tid, true)} className="w-full bg-emerald-700 text-xs py-2 rounded font-bold touch-manipulation">✅ C'était la VÉRITÉ</button>
                    <button onClick={() => bluffReveal(tid, false)} className="w-full bg-zinc-600 text-xs py-2 rounded font-bold touch-manipulation">🤡 C'était un BLUFF</button>
                  </div>
                )}
                <button onClick={() => resetGame(tid)} className="text-rose-500 text-[10px] uppercase font-bold underline mt-2 block touch-manipulation">Reset</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLIND TEST */}
      <div className={`${cardClass} border-t-4 border-fuchsia-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-fuchsia-400">🎵 Blind Test</h2>
          <span className={badgeClass}>{games.blindtest?.state} | {games.blindtest?.players?.length ?? 0} joueurs</span>
        </div>
        <div className="space-y-2">
          {games.blindtest?.state === 'waiting' && (
            <button onClick={btStartRound} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 py-2 rounded text-sm font-bold touch-manipulation">1. Lancer les Inscriptions</button>
          )}
          
          {games.blindtest?.state === 'joining' && (
            <>
              <p className="text-xs text-zinc-400">Inscrits: {games.blindtest.players?.map(p => p.name).join(', ')}</p>
              <button onClick={btStartPlaying} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm font-bold touch-manipulation">2. Fermer les inscriptions & Jouer</button>
            </>
          )}

          {games.blindtest?.state === 'playing' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 font-bold uppercase">Sélectionne qui a levé la main :</p>
              <div className="flex flex-wrap gap-2">
                {games.blindtest.players?.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setBtSelectedPlayer(p.id)}
                    className={`px-3 py-1 text-sm rounded border ${btSelectedPlayer === p.id ? 'bg-fuchsia-600 border-fuchsia-400 font-bold' : 'bg-zinc-800 border-zinc-600 text-zinc-300'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              
              {btSelectedPlayer && (
                <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => btResolve('full')} className="bg-emerald-600 py-2 rounded text-xs font-bold touch-manipulation">✅ Titre+Artiste (+10🪙)</button>
                    <button onClick={() => btResolve('half')} className="bg-emerald-700/60 border border-emerald-500 py-2 rounded text-xs font-bold touch-manipulation">🎵 Titre OU Artiste (+5🪙)</button>
                    <button onClick={() => btResolve('wrong')} className="bg-rose-600 py-2 rounded text-xs font-bold touch-manipulation">❌ Faux (Rouvrir)</button>
                  </div>
                </div>
              )}
              
              <div className="border-t border-zinc-700 pt-3 mt-3">
                <button onClick={() => btResolve('refund')} className="w-full bg-zinc-600 py-2 rounded text-xs font-bold touch-manipulation">🔄 Annuler Manche (Personne n'a trouvé)</button>
              </div>
            </div>
          )}
          
          <button onClick={() => resetGame('blindtest')} className="text-rose-500 text-[10px] uppercase font-bold underline touch-manipulation block mt-2">Reset</button>
        </div>
      </div>

      {/* QUI DANS LA SALLE */}
      <div className={`${cardClass} border-t-4 border-teal-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-teal-400">🤔 Qui dans la salle</h2>
          <span className={badgeClass}>{games.quidanslasalle?.status} | {Object.keys(games.quidanslasalle?.answers ?? {}).length} rép.</span>
        </div>
        {(games.quidanslasalle?.status === 'waiting' || games.quidanslasalle?.status === 'revealed') ? (
          <div className="flex gap-2">
            <input type="text" placeholder="Question…" value={qQuestion} onChange={e => setQQuestion(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm flex-1" />
            <button onClick={qStart} className="bg-teal-600 px-3 rounded text-sm font-bold touch-manipulation">Lancer</button>
          </div>
        ) : (
          <button onClick={qReveal} className="w-full bg-teal-600 py-2 rounded text-sm font-bold touch-manipulation">Fermer & Révéler</button>
        )}
      </div>

      {/* IMPOSTEUR */}
      <div className={`${cardClass} border-t-4 border-white md:col-span-2`}>
        <h2 className="font-bold text-white mb-4">🕵️ Imposteur</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['imposteur1', 'imposteur2'].map(tid => {
            const g = games[tid];
            return (
              <div key={tid} className="bg-zinc-800/50 p-4 rounded border border-zinc-700/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm uppercase">{tid}</h3>
                  <span className={badgeClass}>{g?.state} | {g?.players?.length} joueurs</span>
                </div>
                {g?.state === 'waiting' && (
                  <div className="space-y-2 mb-3">
                    <input type="text" placeholder="Mot Majorité" value={uWords.maj} onChange={e => setUWords({ ...uWords, maj: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs" />
                    <input type="text" placeholder="Mot Imposteur" value={uWords.und} onChange={e => setUWords({ ...uWords, und: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs" />
                    <div className="flex gap-2 items-center text-xs text-zinc-300">
                      <label>Nb Imposteurs:</label>
                      <input type="number" min="1" max="5" value={uWords.count} onChange={e => setUWords({ ...uWords, count: parseInt(e.target.value) })} className="w-12 bg-zinc-900 border border-zinc-700 p-1 rounded" />
                      <label className="flex items-center gap-1"><input type="checkbox" checked={uWords.mrWhite} onChange={e => setUWords({ ...uWords, mrWhite: e.target.checked })} /> Mr White?</label>
                    </div>
                    <button onClick={() => uStart(tid)} className="w-full bg-white text-zinc-900 py-2 rounded text-xs font-bold mt-2 touch-manipulation">
                      ▶ Démarrer (Prélever 10🪙/joueur)
                    </button>
                  </div>
                )}
                {g?.state === 'playing' && (
                  <div className="text-xs text-zinc-300">
                    <p className="mb-2"><strong>Mots:</strong> <span className="text-blue-400">{g.majorityWord}</span> vs <span className="text-red-400">{g.undercoverWord}</span></p>
                    <ul className="space-y-1 mb-2">
                      {g.players.map(p => (
                        <li key={p.id} className={p.eliminated ? 'line-through text-zinc-500' : ''}>
                          {p.name} — <span className={p.role === 'civil' ? 'text-blue-400' : p.role === 'undercover' ? 'text-red-400' : 'text-white font-bold'}>{p.role}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-zinc-400">Cagnotte: <strong className="text-amber-400">{g.pool}🪙</strong></p>
                  </div>
                )}
                {g?.state === 'mrwhite_guess' && (
                  <div className="p-2 border border-amber-500 bg-amber-500/10 rounded mt-2">
                    <p className="text-xs text-amber-400 font-bold mb-2">Arbitrer devinette Mr White</p>
                    <div className="flex gap-2">
                      <button onClick={() => uJudgeMrWhite(tid, true)} className="flex-1 bg-emerald-600 text-xs py-2 rounded touch-manipulation">✅ Correct</button>
                      <button onClick={() => uJudgeMrWhite(tid, false)} className="flex-1 bg-rose-600 text-xs py-2 rounded touch-manipulation">❌ Faux</button>
                    </div>
                  </div>
                )}
                <button onClick={() => resetGame(tid)} className="text-rose-500 text-[10px] uppercase font-bold underline mt-2 block touch-manipulation">Force Reset</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
