import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { AppContext } from '../App';

export default function Login() {
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const { setPlayer, isConnected } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Le prénom est requis');
    if (!isConnected) return setError('Connexion au serveur en cours...');

    socket.emit('join', { name: name.trim(), adminCode: adminCode.trim() }, (res) => {
      if (res.success) {
        setPlayer(res.player);
        localStorage.setItem('techcasino_name', res.player.name);
        if (res.player.isAdmin) {
          localStorage.setItem('techcasino_adminCode', adminCode.trim());
          navigate('/admin');
        } else {
          navigate('/hub');
        }
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="glass-card p-8 w-full max-w-md">
        <h1 
          className="text-4xl font-black text-center mb-2 bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent cursor-default select-none"
          onDoubleClick={() => setShowAdmin(!showAdmin)}
        >
          89 - TechCasino
        </h1>
        <p className="text-zinc-400 text-center mb-8">Bienvenue au casino du BDE 89</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Prénom ou Pseudo</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Ex: Jean D."
              maxLength={20}
              autoFocus
            />
          </div>

          {showAdmin && (
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Code Admin</label>
              <input 
                type="password" 
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-zinc-600"
                placeholder="Réservé au BDE"
                autoFocus
              />
            </div>
          )}

          {error && <div className="text-rose-500 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</div>}
          {!isConnected && <div className="text-amber-500 text-sm animate-pulse text-center">Connexion au serveur...</div>}

          <button 
            type="submit" 
            disabled={!isConnected}
            className="mt-4 w-full bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-rose-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Entrer dans le Casino
          </button>
        </form>
      </div>
    </div>
  );
}
