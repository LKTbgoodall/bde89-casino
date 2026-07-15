import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';

export default function Hub() {
  const { games, leaderboard } = useContext(AppContext);

  const tables = [
    { id: 'fifa', name: '🎮 FIFA 1v1', path: '/games/fifa', location: 'Espace Gaming', desc: 'Tournoi 1v1 sur console' },
    { id: 'babyfoot', name: '⚽ Baby Foot 4v4', path: '/games/babyfoot', location: 'Foyer', desc: 'Matchs par équipes de 4' },
    { id: 'bluff1', name: '🃏 1 Vérité 2 Bluffs (T1)', path: '/games/bluff/bluff1', location: 'Salle A1', desc: 'Devine la vraie anecdote' },
    { id: 'bluff2', name: '🃏 1 Vérité 2 Bluffs (T2)', path: '/games/bluff/bluff2', location: 'Salle A2', desc: 'Devine la vraie anecdote' },
    { id: 'blindtest', name: '🎵 Blind Test', path: '/games/blindtest', location: 'Lounge Musique', desc: 'Sois le plus rapide' },
    { id: 'quidanslasalle', name: '🤔 Qui dans la salle', path: '/games/quidanslasalle', location: 'Amphi', desc: 'Estime le bon pourcentage' },
    { id: 'imposteur1', name: '🕵️ Imposteur (T1)', path: '/games/undercover/imposteur1', location: 'Salle B1', desc: 'Trouve les undercovers' },
    { id: 'imposteur2', name: '🕵️ Imposteur (T2)', path: '/games/undercover/imposteur2', location: 'Salle B2', desc: 'Trouve les undercovers' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Les Tables</h1>
        <p className="text-zinc-400">Choisis un jeu pour participer ou parier en spectateur.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tables.map(table => {
          // Calculate active players rough estimate
          let activePlayers = 0;
          if (games[table.id]) {
             if (table.id === 'fifa') activePlayers = games.fifa.queue?.length + (games.fifa.currentMatch ? 2 : 0) || 0;
             if (table.id === 'babyfoot') activePlayers = (games.babyfoot.left?.length || 0) + (games.babyfoot.right?.length || 0);
             if (table.id.startsWith('imposteur')) activePlayers = games[table.id].players?.length || 0;
             if (table.id.startsWith('bluff')) activePlayers = games[table.id].bets?.length || 0;
             if (table.id === 'blindtest') activePlayers = games.blindtest.bets?.length || 0;
             if (table.id === 'quidanslasalle') activePlayers = Object.keys(games.quidanslasalle.answers || {}).length || 0;
          }

          return (
            <Link 
              key={table.id}
              to={table.path}
              className="glass-card p-5 hover:border-rose-500/50 hover:shadow-rose-500/10 transition-all group relative overflow-hidden block"
            >
              <div className="absolute top-0 right-0 p-3">
                <span className="bg-zinc-800 text-xs px-2 py-1 rounded-md text-zinc-300 font-mono flex items-center gap-1 border border-zinc-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  {activePlayers}
                </span>
              </div>
              <h2 className="text-xl font-bold mb-1 group-hover:text-rose-400 transition-colors">{table.name}</h2>
              <p className="text-sm text-zinc-400 mb-4">{table.desc}</p>
              
              <div className="flex items-center text-xs text-zinc-500">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {table.location}
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-12 glass p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🏆 Top Joueurs
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-zinc-500 italic">Aucun joueur classé pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600'}`}>
                    #{i + 1}
                  </span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <div className="font-mono font-bold text-rose-400">
                  {p.tokens} 🪙
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
