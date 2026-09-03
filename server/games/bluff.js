module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initBluffState = (tableId) => {
    if (!store.games[tableId].choices) {
      store.games[tableId] = { active: null, state: 'waiting', choices: [], truth: null };
    }
  };

  const broadcastBluff = (tableId) => {
    io.emit('game_update', { game: tableId, state: store.games[tableId] });
  };

  // Admin selects active player
  socket.on('bluff_set_active', ({ tableId, targetPlayerId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p || !p.isAdmin) return;
    initBluffState(tableId);

    const target = store.getPlayer(targetPlayerId);
    if (!target) return;

    store.games[tableId] = {
      active: { id: target.id, name: target.name },
      state: 'choosing_truth',
      choices: [],
      truth: null
    };
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
  });

  // Active player chooses where the truth is (A, B, C)
  socket.on('bluff_set_truth', ({ tableId, choice }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBluffState(tableId);
    const game = store.games[tableId];

    if (!p || !game.active || game.active.id !== p.id || game.state !== 'choosing_truth') return;

    game.truth = choice;
    game.state = 'guessing'; // Players can now guess (no bet)
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
  });

  // Players guess A, B, or C — no money required
  socket.on('bluff_guess', ({ tableId, choice }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBluffState(tableId);
    const game = store.games[tableId];

    if (!p || game.state !== 'guessing') return;
    if (game.active && game.active.id === p.id) return callback({ success: false, error: 'Active player cannot guess' });
    if (game.choices.find(c => c.id === p.id)) return callback({ success: false, error: 'Already guessed' });

    game.choices.push({ id: p.id, name: p.name, choice });

    broadcastBluff(tableId);
    if (callback) callback({ success: true });
  });

  // Active player or Admin closes guessing and reveals
  socket.on('bluff_reveal', ({ tableId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBluffState(tableId);
    const game = store.games[tableId];

    if (!p) return;
    if (!p.isAdmin && (!game.active || game.active.id !== p.id)) return;
    if (game.state !== 'guessing') return;

    game.state = 'revealing';

    // Correct guessers get +15 tokens
    const winners = game.choices.filter(c => c.choice === game.truth);
    
    if (winners.length > 0) {
      winners.forEach(w => {
        if (store.players[w.id]) {
          store.players[w.id].tokens += 15;
          io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
        }
      });
    } else {
      // No one found the truth: active player gets +10 bonus
      if (game.active && store.players[game.active.id]) {
        store.players[game.active.id].tokens += 10;
        io.to(store.players[game.active.id].socketId).emit('player_update', store.players[game.active.id]);
      }
    }

    broadcastLeaderboard();
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
    
    // Auto reset after 10s
    setTimeout(() => {
      if (store.games[tableId].state === 'revealing') {
        store.games[tableId] = { active: null, state: 'waiting', choices: [], truth: null };
        broadcastBluff(tableId);
      }
    }, 10000);
  });
};
