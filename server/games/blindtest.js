module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initBTState = () => {
    if (!store.games.blindtest.bets) {
      store.games.blindtest = { state: 'waiting', pool: 0, bets: [], firstBuzzer: null, buzzers: [] };
    }
  };

  const broadcastBT = () => {
    io.emit('game_update', { game: 'blindtest', state: store.games.blindtest });
  };

  socket.on('bt_admin_start_round', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p || !p.isAdmin) return;
    
    initBTState();
    const bt = store.games.blindtest;
    bt.state = 'betting';
    bt.bets = [];
    bt.firstBuzzer = null;
    bt.buzzers = [];
    // DO NOT RESET POOL HERE, pool carries over or is resolved by admin later.
    
    broadcastBT();
    if (callback) callback({ success: true });
  });

  socket.on('bt_bet', ({ amount }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBTState();
    const bt = store.games.blindtest;
    
    if (!p || bt.state !== 'betting') return;
    if (bt.bets.find(x => x.id === p.id)) return callback({ success: false, error: 'Already bet' });
    
    if (amount < 2 || amount > 10 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }

    p.tokens -= amount;
    bt.pool += amount;
    bt.bets.push({ id: p.id, name: p.name, bet: amount });

    socket.emit('player_update', p);
    broadcastLeaderboard();
    broadcastBT();
    if (callback) callback({ success: true });
  });

  socket.on('bt_admin_open_buzzer', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBTState();
    const bt = store.games.blindtest;
    if (!p || !p.isAdmin) return;
    
    bt.state = 'buzzing';
    bt.firstBuzzer = null;
    bt.buzzers = [];
    
    broadcastBT();
    if (callback) callback({ success: true });
  });

  socket.on('bt_buzz', ({ clientTime }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBTState();
    const bt = store.games.blindtest;
    
    if (!p || bt.state !== 'buzzing') return;
    if (!bt.bets.find(x => x.id === p.id)) return; // Must have bet to buzz
    if (bt.buzzers.find(x => x.id === p.id)) return; // Already buzzed
    
    bt.buzzers.push({ id: p.id, name: p.name, time: clientTime || Date.now() });
    
    // Sort buzzers by time
    bt.buzzers.sort((a, b) => a.time - b.time);
    
    if (!bt.firstBuzzer) {
      // First person to buzz locks the state after a short delay (500ms) to allow out-of-order packets
      bt.firstBuzzer = bt.buzzers[0];
      setTimeout(() => {
        const currentBT = store.games.blindtest;
        if (currentBT.state === 'buzzing' && currentBT.buzzers.length > 0) {
           currentBT.state = 'locked';
           currentBT.firstBuzzer = currentBT.buzzers[0]; // recalc in case others arrived
           broadcastBT();
        }
      }, 500);
    }

    if (callback) callback({ success: true });
  });

  // result = 'wrong' | 'half' | 'full' | 'refund'
  socket.on('bt_admin_resolve', ({ result }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initBTState();
    const bt = store.games.blindtest;
    if (!p || !p.isAdmin || bt.state !== 'locked') return;

    if (result === 'wrong') {
      // Eliminate first buzzer from this round?
      bt.buzzers = bt.buzzers.filter(x => x.id !== bt.firstBuzzer.id);
      bt.state = 'buzzing';
      
      if (bt.buzzers.length > 0) {
        bt.state = 'locked';
        bt.firstBuzzer = bt.buzzers[0];
      } else {
        bt.firstBuzzer = null;
      }
    } else if (result === 'half') {
      const winnerId = bt.firstBuzzer.id;
      const winAmount = Math.floor(bt.pool * 0.5);
      if (store.players[winnerId]) {
        store.players[winnerId].tokens += winAmount;
        io.to(store.players[winnerId].socketId).emit('player_update', store.players[winnerId]);
      }
      bt.pool -= winAmount;
      bt.state = 'waiting';
    } else if (result === 'full') {
      const winnerId = bt.firstBuzzer.id;
      if (store.players[winnerId]) {
        store.players[winnerId].tokens += bt.pool;
        io.to(store.players[winnerId].socketId).emit('player_update', store.players[winnerId]);
      }
      bt.pool = 0;
      bt.state = 'waiting';
    } else if (result === 'refund') {
      // Nobody found it
      bt.bets.forEach(b => {
        if (store.players[b.id]) {
          store.players[b.id].tokens += b.bet;
          io.to(store.players[b.id].socketId).emit('player_update', store.players[b.id]);
        }
      });
      bt.pool = 0;
      bt.state = 'waiting';
    }

    broadcastLeaderboard();
    broadcastBT();
    if (callback) callback({ success: true });
  });
};
