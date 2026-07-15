import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const { player, games, leaderboard, updateGame } = useContext(AppContext);
  const [qQuestion, setQQuestion] = useState('');
  const [uWords, setUWords] = useState({ maj: '', und: '', count: 1, mrWhite: false });
  const [tokenTarget, setTokenTarget] = useState('');
  const [tokenAmt, setTokenAmt] = useState(0);

  if (!player?.is_admin) {
    return <div className="text-center text-rose-500 mt-20 text-xl font-bold">Accès refusé</div>;
  }

  // --- Helpers ---
  const resetGame = async (gameId) => {
    const defaults = {
      fifa: { queue: [], currentMatch: null, spectators: [] },
      babyfoot: { left: [], right: [], status: 'waiting', votes: { left: 0, right: 0 }, pool: 0 },
      bluff1: { active: null, state: 'waiting', bets: [], pool: 0 },
      bluff2: { active: null, state: 'waiting', bets: [], pool: 0 },
      blindtest: { state: 'waiting', pool: 0, bets: [], buzzerActive: false, firstBuzzer: null, buzzers: [] },
      quidanslasalle: { question: null, pool: 0, answers: {}, status: 'waiting' },
      imposteur1: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '', pool: 0 },
      imposteur2: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '', pool: 0 },
    };
    await updateGame(gameId, defaults[gameId]);
  };

  const adminTokens = async () => {
    const p = leaderboard.find(p => p.id === tokenTarget);
    if (!p) return alert('Joueur introuvable');
    const { data } = await supabase.from('players').select('tokens').eq('id', tokenTarget).single();
    await supabase.from('players').update({ tokens: (data?.tokens ?? 0) + parseInt(tokenAmt) }).eq('id', tokenTarget);
    alert('✓ Jetons mis à jour !');
  };

  // --- BLUFF ---
  const bluffSetActive = async (tid, targetId) => {
    const targetPlayer = leaderboard.find(p => p.id === targetId);
    if (!targetPlayer) return;
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    s.active = { id: targetPlayer.id, name: targetPlayer.name };
    s.state = 'betting';
    s.bets = [];
    s.pool = 0;
    await updateGame(tid, s);
  };

  const bluffReveal = async (tid, truthWon) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', tid).single();
    const s = data.state;
    if (!s.bets) return;
    const winners = s.bets.filter(b => b.isTruth === truthWon);
    const totalPool = s.pool;
    if (winners.length > 0) {
      const share = Math.floor(totalPool / winners.length);
      for (const w of winners) {
        const { data: wd } = await supabase.from('players').select('tokens').eq('id', w.playerId).single();
        await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + share }).eq('id', w.playerId);
      }
    }
    s.state = 'revealed';
    await updateGame(tid, s);
    setTimeout(() => resetGame(tid), 5000);
  };

  // --- BLIND TEST ---
  const btStartRound = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = { ...data.state, state: 'betting', bets: [], pool: 0, buzzerActive: false, firstBuzzer: null, buzzers: [] };
    await updateGame('blindtest', s);
  };
  const btOpenBuzzer = async () => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = { ...data.state, state: 'buzzing', buzzerActive: true, buzzers: [], firstBuzzer: null };
    await updateGame('blindtest', s);
  };
  const btResolve = async (result) => {
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'blindtest').single();
    const s = data.state;
    const winner = s.firstBuzzer;
    if (!winner) return;
    const bets = s.bets ?? [];
    if (result === 'full') {
      const winnerTokens = (await supabase.from('players').select('tokens').eq('id', winner.id).single()).data?.tokens ?? 0;
      await supabase.from('players').update({ tokens: winnerTokens + s.pool }).eq('id', winner.id);
    } else if (result === 'half') {
      const winnerTokens = (await supabase.from('players').select('tokens').eq('id', winner.id).single()).data?.tokens ?? 0;
      await supabase.from('players').update({ tokens: winnerTokens + Math.floor(s.pool / 2) }).eq('id', winner.id);
    } else if (result === 'refund' || result === 'wrong') {
      if (result === 'refund') {
        for (const b of bets) {
          const { data: wd } = await supabase.from('players').select('tokens').eq('id', b.playerId).single();
          await supabase.from('players').update({ tokens: (wd?.tokens ?? 0) + b.amount }).eq('id', b.playerId);
        }
      } else {
        // wrong = open buzzer again
        const ns = { ...s, state: 'buzzing', buzzerActive: true, firstBuzzer: null, buzzers: [] };
        return await updateGame('blindtest', ns);
      }
    }
    await updateGame('blindtest', { ...s, state: 'waiting', pool: 0, bets: [], buzzerActive: false, firstBuzzer: null, buzzers: [] });
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

      {/* TOKEN MANAGEMENT */}
      <div className={`${cardClass} border-t-4 border-yellow-500`}>
        <h2 className="font-bold mb-4 text-yellow-400">💰 Jetons Joueurs</h2>
        <div className="flex gap-2 items-center">
          <select value={tokenTarget} onChange={e => setTokenTarget(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 flex-1 text-sm">
            <option value="">Choisir un joueur…</option>
            {leaderboard.map(p => <option key={p.id} value={p.id}>{p.name} ({p.tokens}🪙)</option>)}
          </select>
          <input type="number" value={tokenAmt} onChange={e => setTokenAmt(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 w-20 text-center" placeholder="±" />
          <button onClick={adminTokens} className="bg-yellow-600 hover:bg-yellow-500 px-3 py-2 rounded font-bold text-sm touch-manipulation">OK</button>
        </div>
        <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
          {leaderboard.map((p, i) => (
            <div key={p.id} className="flex justify-between text-sm px-2 py-1 bg-zinc-800/50 rounded">
              <span>#{i+1} {p.name}</span><span className="text-amber-400 font-mono">{p.tokens}🪙</span>
            </div>
          ))}
        </div>
      </div>

      {/* FIFA */}
      <div className={`${cardClass} border-t-4 border-rose-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-rose-400">🎮 FIFA</h2>
          <span className={badgeClass}>File: {games.fifa?.queue?.length ?? 0} | {games.fifa?.currentMatch ? 'Match en cours' : 'Libre'}</span>
        </div>
        <button onClick={() => resetGame('fifa')} className="w-full bg-rose-900/30 border border-rose-500/30 text-rose-400 text-xs py-2 rounded hover:bg-rose-900/50 touch-manipulation">⚠️ Reset</button>
      </div>

      {/* BABYFOOT */}
      <div className={`${cardClass} border-t-4 border-emerald-500`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-emerald-400">⚽ Baby Foot</h2>
          <span className={badgeClass}>{games.babyfoot?.status} | {(games.babyfoot?.left?.length ?? 0) + (games.babyfoot?.right?.length ?? 0)} joueurs</span>
        </div>
        <div className="flex gap-2">
          {games.babyfoot?.status === 'waiting' && <button onClick={bfStartMatch} className="flex-1 bg-emerald-700 hover:bg-emerald-600 py-2 rounded text-xs font-bold touch-manipulation">Lancer les mises</button>}
          {games.babyfoot?.status === 'betting' && <button onClick={bfStartPlaying} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-xs font-bold touch-manipulation">Démarrer le match</button>}
          <button onClick={() => resetGame('babyfoot')} className="bg-rose-900/30 border border-rose-500/30 text-rose-400 text-xs px-3 py-2 rounded hover:bg-rose-900/50 touch-manipulation">Reset</button>
        </div>
      </div>

      {/* BLUFF */}
      <div className={`${cardClass} border-t-4 border-indigo-500`}>
        <h2 className="font-bold text-indigo-400 mb-4">🃏 1V2B</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['bluff1', 'bluff2'].map(tid => {
            const g = games[tid];
            return (
              <div key={tid} className="bg-zinc-800/50 p-3 rounded border border-zinc-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold uppercase">{tid}</span>
                  <span className={badgeClass}>{g?.state} | {g?.pool ?? 0}🪙</span>
                </div>
                {g?.state === 'waiting' && (
                  <div className="flex gap-1">
                    <select id={`bsel_${tid}`} className="bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-xs flex-1">
                      {leaderboard.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={() => bluffSetActive(tid, document.getElementById(`bsel_${tid}`).value)} className="bg-indigo-600 px-2 py-1 rounded text-xs font-bold touch-manipulation">Go</button>
                  </div>
                )}
                {g?.state === 'betting' && (
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs text-zinc-400 mb-1">Sur scène : <strong className="text-white">{g.active?.name}</strong> | {g.bets?.length ?? 0} paris</p>
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
          <span className={badgeClass}>{games.blindtest?.state} | {games.blindtest?.pool ?? 0}🪙</span>
        </div>
        <div className="space-y-2">
          <button onClick={btStartRound} className="w-full bg-zinc-700 hover:bg-zinc-600 py-2 rounded text-sm font-bold touch-manipulation">1. Nouveau Round (Paris)</button>
          <button onClick={btOpenBuzzer} className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded text-sm font-bold touch-manipulation">2. Ouvrir le Buzzer</button>
          {games.blindtest?.state === 'locked' && (
            <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3">
              <p className="text-sm text-center">1er buzzer : <strong className="text-fuchsia-400">{games.blindtest.firstBuzzer?.name}</strong></p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => btResolve('full')} className="bg-emerald-600 py-2 rounded text-xs font-bold touch-manipulation">✅ Titre+Artiste</button>
                <button onClick={() => btResolve('half')} className="bg-emerald-700/60 border border-emerald-500 py-2 rounded text-xs font-bold touch-manipulation">🎵 Titre OU Artiste</button>
                <button onClick={() => btResolve('wrong')} className="bg-rose-600 py-2 rounded text-xs font-bold touch-manipulation">❌ Faux (Rouvrir)</button>
                <button onClick={() => btResolve('refund')} className="bg-zinc-600 py-2 rounded text-xs font-bold touch-manipulation">🔄 Remboursement</button>
              </div>
            </div>
          )}
          <button onClick={() => resetGame('blindtest')} className="text-rose-500 text-[10px] uppercase font-bold underline touch-manipulation">Reset</button>
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
