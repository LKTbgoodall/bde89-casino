module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initBluffState = (tableId) => {
    if (!store.games[tableId].bets) {
      store.games[tableId] = { active: null, state: 'waiting', bets: [], pool: 0, truth: null };
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
      bets: [],
      pool: 0,
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
    game.state = 'betting'; // Players can now bet
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
  });

  // Players bet on A, B, C
  socket.on('bluff_bet', ({ tableId, amount, choice }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBluffState(tableId);
    const game = store.games[tableId];

    if (!p || game.state !== 'betting') return;
    if (game.active && game.active.id === p.id) return callback({ success: false, error: 'Active player cannot bet' });
    if (game.bets.find(b => b.id === p.id)) return callback({ success: false, error: 'Already bet' });

    if (amount < 2 || amount > 15 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }

    p.tokens -= amount;
    game.pool += amount;
    game.bets.push({ id: p.id, bet: amount, choice });

    socket.emit('player_update', p);
    broadcastLeaderboard();
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
  });

  // Active player or Admin closes betting and reveals
  socket.on('bluff_reveal', ({ tableId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBluffState(tableId);
    const game = store.games[tableId];

    if (!p) return;
    if (!p.isAdmin && (!game.active || game.active.id !== p.id)) return;
    if (game.state !== 'betting') return;

    game.state = 'revealing';

    // Distribute rewards
    const winners = game.bets.filter(b => b.choice === game.truth);
    
    if (winners.length > 0) {
      // Winners get ×2 of their bet
      winners.forEach(w => {
        if (store.players[w.id]) {
          const winAmount = w.bet * 2;
          store.players[w.id].tokens += winAmount;
          game.pool -= winAmount; // deduct from pool
          io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
        }
      });
      // Remaining pool (losers bets minus house payout) just stays or goes to BDE
      // Note: if x2 payout is more than pool, pool could go negative temporarily but pool is just for tracking here
    } else {
      // No one found the truth, active player takes the pool + 10 bonus
      if (store.players[game.active.id]) {
        store.players[game.active.id].tokens += game.pool + 10;
        io.to(store.players[game.active.id].socketId).emit('player_update', store.players[game.active.id]);
      }
    }

    broadcastLeaderboard();
    broadcastBluff(tableId);
    if (callback) callback({ success: true });
    
    // Auto reset after 10s
    setTimeout(() => {
      if (store.games[tableId].state === 'revealing') {
        store.games[tableId] = { active: null, state: 'waiting', bets: [], pool: 0, truth: null };
        broadcastBluff(tableId);
      }
    }, 10000);
  });
};
