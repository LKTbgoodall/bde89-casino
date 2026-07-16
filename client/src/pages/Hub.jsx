import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

const TABLES = [
  { id: 'fifa',          name: '🎮 FIFA 1v1',             path: '/games/fifa',                  location: 'Espace Gaming',    desc: 'Tournoi 1v1 sur console', rules: "Affronte un autre joueur sur FIFA. Si tu gagnes, tu remportes la mise." },
  { id: 'babyfoot',      name: '⚽ Baby Foot 4v4',         path: '/games/babyfoot',              location: 'Foyer',            desc: 'Matchs par équipes de 4', rules: "Des matchs se déroulent en équipe. Tu peux parier sur l'équipe de gauche ou de droite." },
  { id: 'bluff1',        name: '🃏 1V2B — Table 1',        path: '/games/bluff/bluff1',          location: 'Salle A1',         desc: 'Devine la vraie anecdote', rules: "Un joueur monte sur scène et raconte une anecdote. À toi de miser pour deviner si c'est la VÉRITÉ ou un gros BLUFF !" },
  { id: 'bluff2',        name: '🃏 1V2B — Table 2',        path: '/games/bluff/bluff2',          location: 'Salle A2',         desc: 'Devine la vraie anecdote', rules: "Un joueur monte sur scène et raconte une anecdote. À toi de miser pour deviner si c'est la VÉRITÉ ou un gros BLUFF !" },
  { id: 'blindtest',     name: '🎵 Blind Test',            path: '/games/blindtest',             location: 'Lounge Musique',   desc: 'Sois le plus rapide', rules: "Mise avant que la musique ne commence. Dès que tu reconnais, appuie sur le gros bouton BUZZ sur ton écran et donne la réponse à l'animateur." },
  { id: 'quidanslasalle',name: '🤔 Qui dans la salle',     path: '/games/quidanslasalle',        location: 'Amphi',            desc: 'Estime le bon pourcentage', rules: "L'animateur pose une question (ex: Qui a déjà redoublé ?). Parie sur le pourcentage exact de personnes dans la salle qui vont se lever." },
  { id: 'imposteur1',    name: '🕵️ Imposteur — Table 1',   path: '/games/undercover/imposteur1', location: 'Salle B1',         desc: 'Trouve les undercovers', rules: "Jeu type Undercover. Chaque joueur reçoit un mot. Les civils ont le même, les imposteurs en ont un différent. Éliminez les imposteurs en votant !" },
  { id: 'imposteur2',    name: '🕵️ Imposteur — Table 2',   path: '/games/undercover/imposteur2', location: 'Salle B2',         desc: 'Trouve les undercovers', rules: "Jeu type Undercover. Chaque joueur reçoit un mot. Les civils ont le même, les imposteurs en ont un différent. Éliminez les imposteurs en votant !" },
];

export default function Hub() {
  const { games, leaderboard } = useContext(AppContext);
  const [selectedGame, setSelectedGame] = useState(null);
  const navigate = useNavigate();

  const getCount = (id) => {
    const g = games[id];
    if (!g) return 0;
    if (id === 'fifa') return (g.queue?.length ?? 0) + (g.currentMatch ? 2 : 0);
    if (id === 'babyfoot') return (g.left?.length ?? 0) + (g.right?.length ?? 0);
    if (id.startsWith('imposteur')) return g.players?.length ?? 0;
    if (id.startsWith('bluff')) return g.bets?.length ?? 0;
    if (id === 'blindtest') return g.bets?.length ?? 0;
    if (id === 'quidanslasalle') return Object.keys(g.answers ?? {}).length;
    return 0;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold mb-1">Les Tables 🎰</h1>
        <p className="text-zinc-400">Choisis un jeu pour participer ou parier.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TABLES.map(table => (
          <button
            key={table.id}
            onClick={() => setSelectedGame(table)}
            className="glass-card p-5 hover:border-rose-500/50 hover:shadow-rose-500/10 transition-all group relative overflow-hidden block touch-manipulation text-left w-full"
          >
            <div className="absolute top-3 right-3">
              <span className="bg-zinc-800 text-xs px-2 py-1 rounded-md text-zinc-300 font-mono flex items-center gap-1 border border-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                {getCount(table.id)}
              </span>
            </div>
            <h2 className="text-lg font-bold mb-1 group-hover:text-rose-400 transition-colors pr-12">{table.name}</h2>
            <p className="text-sm text-zinc-400 mb-3">{table.desc}</p>
            <div className="flex items-center text-xs text-zinc-500">
              <span className="mr-1">📍</span>{table.location}
            </div>
          </button>
        ))}
      </div>

      {selectedGame && (
        <div className="fixed inset-0 h-[100dvh] z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="glass-card w-full max-w-sm max-h-[90dvh] overflow-y-auto p-6 border-rose-500/30 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-black text-rose-400">{selectedGame.name}</h2>
              <button onClick={() => setSelectedGame(null)} className="text-zinc-500 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
                <div className="text-xs text-zinc-400 uppercase font-bold mb-1">📍 Lieu</div>
                <div className="font-medium text-white">{selectedGame.location}</div>
              </div>
              
              <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700">
                <div className="text-xs text-zinc-400 uppercase font-bold mb-1">📖 Règles du jeu</div>
                <div className="text-sm text-zinc-300 leading-relaxed">{selectedGame.rules}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedGame(null)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 touch-manipulation">
                Retour
              </button>
              <button onClick={() => navigate(selectedGame.path)} className="flex-1 bg-rose-600 hover:bg-rose-500 py-3 rounded-xl text-white font-bold touch-manipulation shadow-lg shadow-rose-500/20">
                Rejoindre 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <section className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">🏆 Top Joueurs</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`font-black w-6 text-center text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>#{i+1}</span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <span className="font-mono font-bold text-rose-400">{p.tokens} 🪙</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
