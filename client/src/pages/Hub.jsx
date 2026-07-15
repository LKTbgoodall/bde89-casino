import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';

const TABLES = [
  { id: 'fifa',          name: '🎮 FIFA 1v1',             path: '/games/fifa',                  location: 'Espace Gaming',    desc: 'Tournoi 1v1 sur console' },
  { id: 'babyfoot',      name: '⚽ Baby Foot 4v4',         path: '/games/babyfoot',              location: 'Foyer',            desc: 'Matchs par équipes de 4' },
  { id: 'bluff1',        name: '🃏 1V2B — Table 1',        path: '/games/bluff/bluff1',          location: 'Salle A1',         desc: 'Devine la vraie anecdote' },
  { id: 'bluff2',        name: '🃏 1V2B — Table 2',        path: '/games/bluff/bluff2',          location: 'Salle A2',         desc: 'Devine la vraie anecdote' },
  { id: 'blindtest',     name: '🎵 Blind Test',            path: '/games/blindtest',             location: 'Lounge Musique',   desc: 'Sois le plus rapide' },
  { id: 'quidanslasalle',name: '🤔 Qui dans la salle',     path: '/games/quidanslasalle',        location: 'Amphi',            desc: 'Estime le bon pourcentage' },
  { id: 'imposteur1',    name: '🕵️ Imposteur — Table 1',   path: '/games/undercover/imposteur1', location: 'Salle B1',         desc: 'Trouve les undercovers' },
  { id: 'imposteur2',    name: '🕵️ Imposteur — Table 2',   path: '/games/undercover/imposteur2', location: 'Salle B2',         desc: 'Trouve les undercovers' },
];

export default function Hub() {
  const { games, leaderboard } = useContext(AppContext);

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
          <Link
            key={table.id}
            to={table.path}
            className="glass-card p-5 hover:border-rose-500/50 hover:shadow-rose-500/10 transition-all group relative overflow-hidden block touch-manipulation"
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
          </Link>
        ))}
      </div>

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
