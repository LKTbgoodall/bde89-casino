import React, { useState } from 'react';
import { socket } from '../socket';

export default function NeedAdmin() {
  const [cooldown, setCooldown] = useState(false);

  const handleSos = () => {
    if (cooldown) return;
    
    let table = 'Général';
    const path = window.location.pathname;
    if (path.includes('/fifa')) table = 'FIFA';
    if (path.includes('/babyfoot')) table = 'Baby Foot';
    if (path.includes('/bluff')) table = '1V2 Bluffs';
    if (path.includes('/blindtest')) table = 'Blind Test';
    if (path.includes('/quidanslasalle')) table = 'Qui dans la salle';
    if (path.includes('/undercover')) table = 'Imposteur';

    socket.emit('sos', { table });
    
    setCooldown(true);
    setTimeout(() => setCooldown(false), 30000); // 30s cooldown
  };

  return (
    <button 
      onClick={handleSos}
      disabled={cooldown}
      className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 flex items-center justify-center transition-all ${
        cooldown 
          ? 'bg-zinc-700 text-zinc-500 scale-95' 
          : 'bg-rose-600 text-white hover:bg-rose-500 hover:scale-105 shadow-rose-500/50'
      }`}
      title="Besoin d'un admin"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="ml-2 font-bold hidden sm:inline">
        {cooldown ? 'Appelé...' : 'Admin SOS'}
      </span>
    </button>
  );
}
