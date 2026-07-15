import React, { useContext, useState } from 'react';
import { AppContext } from '../../App';
import { supabase } from '../../lib/supabase';

export default function QuiDansLaSalle() {
  const { player, games, updateGame } = useContext(AppContext);
  const [betAmount, setBetAmount] = useState(2);
  const [percent, setPercent] = useState(50);
  const [isMe, setIsMe] = useState(null);

  const q = games.quidanslasalle ?? { status: 'waiting', question: null, pool: 0, answers: {} };
  const myAnswer = q.answers?.[player.id];

  const submitAnswer = async () => {
    if (isMe === null) return alert('Choisis si ça te correspond !');
    const amt = parseInt(betAmount);
    if (amt < 2 || amt > 15) return alert('Mise entre 2 et 15 🪙');
    const { data } = await supabase.from('game_states').select('state').eq('game_id', 'quidanslasalle').single();
    const s = data.state;
    s.answers = s.answers ?? {};
    s.answers[player.id] = { playerId: player.id, name: player.name, isMe, percent: parseInt(percent), bet: amt };
    s.pool = (s.pool ?? 0) + amt;
    await supabase.from('players').update({ tokens: player.tokens - amt }).eq('id', player.id);
    await updateGame('quidanslasalle', s);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h1 className="text-3xl font-bold text-center text-teal-400">🤔 Qui dans la salle ?</h1>

      {q.status === 'waiting' && (
        <div className="glass p-8 text-center text-zinc-400 rounded-xl">
          <div className="text-4xl mb-3">🤔</div>
          <p>En attente de la prochaine question…</p>
        </div>
      )}

      {q.status === 'betting' && (
        <div className="glass-card p-6 border-t-4 border-teal-500">
          <div className="text-center mb-8">
            <span className="text-teal-400 font-bold uppercase tracking-widest text-xs mb-2 block">Question</span>
            <h2 className="text-2xl font-black text-white bg-zinc-800/80 px-4 py-3 rounded-xl border border-zinc-700 inline-block">
              {q.question}
            </h2>
          </div>

          {!myAnswer ? (
            <div className="space-y-8">
              <div>
                <h3 className="font-bold text-center mb-3">1. Est-ce que ça te correspond ?</h3>
                <div className="flex gap-4">
                  <button onClick={() => setIsMe(true)} className={`flex-1 py-4 rounded-xl font-bold border touch-manipulation ${isMe === true ? 'bg-teal-600/30 border-teal-500 text-teal-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>Oui 👍</button>
                  <button onClick={() => setIsMe(false)} className={`flex-1 py-4 rounded-xl font-bold border touch-manipulation ${isMe === false ? 'bg-rose-600/30 border-rose-500 text-rose-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>Non 👎</button>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-center mb-1">2. Estime le % de Oui dans la salle</h3>
                <div className="text-center text-4xl font-black text-teal-400 mb-2">{percent}%</div>
                <input type="range" min="0" max="100" value={percent} onChange={e => setPercent(e.target.value)} className="w-full accent-teal-500" />
              </div>
              <div>
                <h3 className="font-bold text-center mb-3">3. Ta mise (2-15🪙)</h3>
                <div className="flex gap-3 justify-center">
                  {[2, 5, 10, 15].map(v => (
                    <button key={v} onClick={() => setBetAmount(v)} className={`flex-1 py-4 rounded-xl border font-bold touch-manipulation ${betAmount === v ? 'bg-teal-600/30 border-teal-500 text-teal-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{v}</button>
                  ))}
                </div>
              </div>
              <button onClick={submitAnswer} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-5 rounded-xl shadow-lg shadow-teal-500/20 active:scale-[0.98] text-lg touch-manipulation">
                Verrouiller ma réponse 🔒
              </button>
            </div>
          ) : (
            <div className="text-center p-6 bg-teal-900/30 rounded-xl border border-teal-500/30">
              <p className="text-teal-400 font-bold text-lg mb-2">✓ Réponse enregistrée !</p>
              <p className="text-zinc-300">Ton statut : <span className="font-bold">{myAnswer.isMe ? 'Oui' : 'Non'}</span></p>
              <p className="text-zinc-300">Ton estimation : <span className="font-bold text-teal-400">{myAnswer.percent}%</span></p>
              <p className="text-zinc-400 text-sm mt-4 animate-pulse">Attends que tout le monde ait voté…</p>
              <p className="text-xs text-zinc-500 mt-2">{Object.keys(q.answers).length} réponse(s) reçue(s)</p>
            </div>
          )}
        </div>
      )}

      {q.status === 'revealed' && (
        <div className="glass-card p-8 text-center border border-teal-500">
          <h2 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-4">Résultat</h2>
          <div className="text-7xl font-black text-white mb-4 drop-shadow-[0_0_20px_rgba(45,212,191,0.5)]">
            {q.truePercent ?? '?'}%
          </div>
          <p className="text-lg text-zinc-300 mb-6">ont répondu <strong>Oui</strong> !</p>

          {myAnswer && (
            <div className="bg-zinc-800/50 p-4 rounded-xl mb-4 border border-zinc-700">
              <p className="text-sm text-zinc-400">Ton estimation : <span className={`font-bold ${Math.abs(myAnswer.percent - q.truePercent) <= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>{myAnswer.percent}%</span>
              {' '}(écart: {Math.abs(myAnswer.percent - q.truePercent)}%)
              </p>
            </div>
          )}

          {q.winners?.length > 0 && (
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
              <h3 className="font-bold text-teal-400 mb-2">🏆 Gagnants</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {q.winners.map(wId => {
                  const ans = q.answers[wId];
                  return <span key={wId} className="bg-zinc-900 px-3 py-1 rounded-full text-sm border border-zinc-700">{ans?.name} ({ans?.percent}%)</span>;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
