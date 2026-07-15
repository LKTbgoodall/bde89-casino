import React, { useContext, useEffect } from 'react';
import { AppContext } from '../App';

export default function Screen() {
  const { leaderboard } = useContext(AppContext);

  // Auto scroll effect or just display top 15
  const topPlayers = leaderboard.slice(0, 15);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-8 overflow-hidden z-[100]">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-fuchsia-500 mb-12 relative z-10 text-center drop-shadow-2xl">
        89 - TechCasino
      </h1>
      
      <div className="w-full max-w-5xl relative z-10">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-3xl p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {topPlayers.map((p, i) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-4 transition-all"
              >
                <div className="flex items-center gap-6">
                  <span className={`text-3xl font-black w-12 text-center ${
                    i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 
                    i === 1 ? 'text-zinc-300 drop-shadow-[0_0_10px_rgba(212,212,216,0.8)]' : 
                    i === 2 ? 'text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]' : 
                    'text-zinc-500'
                  }`}>
                    #{i + 1}
                  </span>
                  <span className={`text-3xl font-bold truncate ${i < 3 ? 'text-white' : 'text-zinc-300'}`}>
                    {p.name}
                  </span>
                </div>
                <div className={`text-4xl font-mono font-black ${i < 3 ? 'text-rose-400' : 'text-zinc-400'}`}>
                  {p.tokens} <span className="text-3xl">🪙</span>
                </div>
              </div>
            ))}
            
            {topPlayers.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 text-2xl py-20 italic">
                La partie va bientôt commencer...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 text-zinc-500 text-xl font-medium">
        Rejoignez-nous sur le WiFi de l'école
      </div>
    </div>
  );
}
