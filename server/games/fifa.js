module.exports = (io, socket, store, broadcastLeaderboard) => {
  // Utility to broadcast FIFA state
  const broadcastFifa = () => {
    io.emit('game_update', { game: 'fifa', state: store.games.fifa });
  };

  socket.on('fifa_join_queue', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p) return;
    
    // Enforce one game at a time for physical queues
    store.leaveAllGames(p.id, io);

    // Check if already in queue or playing
    const fifa = store.games.fifa;
    if (fifa.queue.find(x => x.id === p.id)) return callback({ success: false, error: 'Already in queue' });
    if (fifa.currentMatch && (fifa.currentMatch.player1 === p.id || fifa.currentMatch.player2 === p.id)) {
       return callback({ success: false, error: 'Already playing' });
    }

    fifa.queue.push({ id: p.id, name: p.name, ready: false });
    broadcastFifa();
    if (callback) callback({ success: true });
    
    checkFifaMatch(fifa);
  });

  const checkFifaMatch = (fifa) => {
    if (!fifa.currentMatch && fifa.queue.length >= 2) {
      // Pick first two
      const p1 = fifa.queue.shift();
      const p2 = fifa.queue.shift();
      fifa.currentMatch = {
        player1: p1.id,
        player2: p2.id,
        p1Name: p1.name,
        p2Name: p2.name,
        spectatorPool: 0,
        p1Ready: false,
        p2Ready: false,
        p1Vote: null,
        p2Vote: null,
        matchStarted: false
      };
      
      // Start 90s timer for them to confirm
      setTimeout(() => {
        const current = store.games.fifa.currentMatch;
        if (current && (!current.p1Ready || !current.p2Ready) && current.player1 === p1.id) {
           // Someone didn't confirm
           const newFifa = store.games.fifa;
           newFifa.currentMatch = null;
           // Put the ready one back at the top of the queue
           if (current.p2Ready) newFifa.queue.unshift(p2);
           if (current.p1Ready) newFifa.queue.unshift(p1);
           
           checkFifaMatch(newFifa);
           broadcastFifa();
        }
      }, 90 * 1000);

      broadcastFifa();
    }
  };

  // Players just confirm they are ready (no bet)
  socket.on('fifa_ready', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const fifa = store.games.fifa;
    if (!p || !fifa.currentMatch) return;
    
    const current = fifa.currentMatch;

    if (current.player1 === p.id) {
      current.p1Ready = true;
    } else if (current.player2 === p.id) {
      current.p2Ready = true;
    } else {
      return;
    }

    if (current.p1Ready && current.p2Ready) {
      current.matchStarted = true;
    }
    
    broadcastFifa();
    if (callback) callback({ success: true });
  });

  // Spectators can still bet on the winner
  socket.on('fifa_spectator_bet', ({ amount, betOnId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const fifa = store.games.fifa;
    if (!p || !fifa.currentMatch || fifa.currentMatch.matchStarted) {
      return callback && callback({ success: false, error: 'Cannot bet now' });
    }

    if (amount < 2 || amount > 15 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount (2-15)' });
    }

    p.tokens -= amount;
    fifa.currentMatch.spectatorPool += amount;
    
    fifa.spectators.push({ id: p.id, name: p.name, betOn: betOnId, amount });
    
    socket.emit('player_update', p);
    broadcastLeaderboard();
    broadcastFifa();
    if (callback) callback({ success: true });
  });

  socket.on('fifa_submit_score', ({ winnerId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const fifa = store.games.fifa;
    if (!p || !fifa.currentMatch || !fifa.currentMatch.matchStarted) return;

    const current = fifa.currentMatch;
    if (current.player1 === p.id) current.p1Vote = winnerId;
    else if (current.player2 === p.id) current.p2Vote = winnerId;
    else return;

    if (current.p1Vote && current.p2Vote) {
      if (current.p1Vote === current.p2Vote) {
        // Agreement!
        const realWinnerId = current.p1Vote;
        resolveFifaMatch(realWinnerId, fifa, current);
      } else {
        // Disagreement - refund spectators and no winner bonus
        resolveFifaMatch(null, fifa, current);
        // Alert admin
        io.to('admins').emit('sos_alert', { 
          playerName: 'FIFA System', 
          table: 'Désaccord FIFA entre ' + current.p1Name + ' et ' + current.p2Name 
        });
      }
    }
    
    broadcastFifa();
    if (callback) callback({ success: true });
  });

  const resolveFifaMatch = (winnerId, fifa, current) => {
    if (winnerId) {
      // Winner gets +20 tokens fixed reward
      if (store.players[winnerId]) {
        store.players[winnerId].tokens += 20;
        io.to(store.players[winnerId].socketId).emit('player_update', store.players[winnerId]);
      }

      // Spectators who bet on winner get proportional share of spectator pool
      const spectatorPool = current.spectatorPool;
      if (spectatorPool > 0) {
        const winningSpectators = fifa.spectators.filter(s => s.betOn === winnerId);
        const totalWinningBets = winningSpectators.reduce((sum, s) => sum + s.amount, 0);

        if (totalWinningBets > 0) {
          winningSpectators.forEach(s => {
            const sWin = Math.floor((s.amount / totalWinningBets) * spectatorPool);
            if (store.players[s.id]) {
              store.players[s.id].tokens += sWin;
              io.to(store.players[s.id].socketId).emit('player_update', store.players[s.id]);
            }
          });
        }
        // Losers' bets stay gone (house keeps)
      }
    } else {
      // Disagreement: refund spectators
      fifa.spectators.forEach(s => {
        if (store.players[s.id]) {
           store.players[s.id].tokens += s.amount;
           io.to(store.players[s.id].socketId).emit('player_update', store.players[s.id]);
        }
      });
    }

    broadcastLeaderboard();
    // Reset match
    fifa.currentMatch = null;
    fifa.spectators = [];
    checkFifaMatch(fifa);
  };
};
