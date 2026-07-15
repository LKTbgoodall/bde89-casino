import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { AppContext } from '../App';

export default function Login() {
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setPlayer, isConnected } = useContext(AppContext);
  const navigate = useNavigate();
  const pendingLoginRef = useRef(null);

  // If user submitted while disconnected, retry as soon as we connect
  useEffect(() => {
    if (isConnected && pendingLoginRef.current) {
      const { name, adminCode } = pendingLoginRef.current;
      pendingLoginRef.current = null;
      doLogin(name, adminCode);
    }
  }, [isConnected]);

  const doLogin = (nameVal, adminCodeVal) => {
    setLoading(true);
    setError('');
    socket.emit('join', { name: nameVal.trim(), adminCode: adminCodeVal.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        setPlayer(res.player);
        localStorage.setItem('techcasino_name', res.player.name);
        if (res.player.isAdmin) {
          localStorage.setItem('techcasino_adminCode', adminCodeVal.trim());
          navigate('/admin');
        } else {
          navigate('/hub');
        }
      } else {
        setError(res.error || 'Erreur inconnue');
      }
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Le prénom est requis');

    if (!isConnected) {
      // Queue the login attempt — will fire as soon as server responds
      pendingLoginRef.current = { name, adminCode };
      setLoading(true);
      setError('');
      return;
    }

    doLogin(name, adminCode);
  };

  const isWaiting = loading || (!isConnected && pendingLoginRef.current);

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
              />
            </div>
          )}

          {error && <div className="text-rose-500 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</div>}

          {/* Status indicator */}
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            {isConnected ? 'Serveur connecté' : 'Connexion au serveur en cours...'}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-[0.97] disabled:opacity-70 text-lg touch-manipulation"
          >
            {loading && !isConnected ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Réveil du serveur...
              </span>
            ) : loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Connexion...
              </span>
            ) : (
              'Entrer dans le Casino'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
