import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';

export default function Login() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { login } = useContext(AppContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return setError('Entre ton prénom ET ton nom !');
    setLoading(true);
    setError('');
    try {
      const player = await login(firstName.trim(), lastName.trim(), adminCode.trim());
      navigate(player.is_admin ? '/admin' : '/hub');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh]">
      <div className="glass-card p-8 w-full max-w-md">
        <h1
          className="text-4xl font-black text-center mb-2 bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent select-none cursor-default"
          onDoubleClick={() => setShowAdmin(v => !v)}
        >
          89 — TechCasino
        </h1>
        <p className="text-zinc-400 text-center mb-8">Bienvenue au casino du BDE 89</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: Jean"
                maxLength={20}
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Nom de famille</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: Dupont"
                maxLength={20}
              />
            </div>
          </div>

          {showAdmin && (
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Code Admin</label>
              <input
                type="password"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="Réservé au BDE"
              />
            </div>
          )}

          {error && (
            <div className="text-rose-400 text-sm bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold py-5 rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-[0.97] disabled:opacity-70 text-xl touch-manipulation"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Connexion...
              </span>
            ) : 'Entrer dans le Casino 🎰'}
          </button>
        </form>
      </div>
    </div>
  );
}
