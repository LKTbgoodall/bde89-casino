module.exports = (io, socket, store, broadcastLeaderboard) => {
  // Utility to broadcast FIFA state
  const broadcastFifa = () => {
    io.emit('game_update', { game: 'fifa', state: store.games.fifa });
  };

  socket.on('fifa_join_queue', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p) return;
    
    // Enforce one game at a time for physical queues
    store.leaveAllGames(p.id);

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
        pool: 0,
        p1Ready: false,
        p2Ready: false,
        p1Bet: 0,
        p2Bet: 0,
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

  socket.on('fifa_confirm', ({ bet }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const fifa = store.games.fifa;
    if (!p || !fifa.currentMatch) return;
    
    const current = fifa.currentMatch;
    
    // Check bet limits
    if (bet < 5 || bet > 30 || bet > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }

    if (current.player1 === p.id) {
      current.p1Ready = true;
      current.p1Bet = bet;
    } else if (current.player2 === p.id) {
      current.p2Ready = true;
      current.p2Bet = bet;
    } else {
      return;
    }

    // Deduct tokens
    p.tokens -= bet;
    current.pool += bet;
    socket.emit('player_update', p);
    broadcastLeaderboard();

    if (current.p1Ready && current.p2Ready) {
      current.matchStarted = true;
    }
    
    broadcastFifa();
    if (callback) callback({ success: true });
  });

  socket.on('fifa_spectator_bet', ({ amount, betOnId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const fifa = store.games.fifa;
    if (!p || !fifa.currentMatch || fifa.currentMatch.matchStarted) {
      return callback && callback({ success: false, error: 'Cannot bet now' });
    }

    if (amount < 2 || amount > 15 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }

    p.tokens -= amount;
    fifa.currentMatch.pool += amount;
    
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
        // Disagreement - null score and refund all
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
      // Winner takes all from the pool (players + spectator bets)
      // Actually wait, if spectators bet on the winner, they should get a share?
      // "Gagnant prend tout (joueurs + spectateurs gagnants)" -> Winner takes their share, spectator winners take theirs based on proportion.
      
      const totalPool = current.pool;
      
      // Calculate how much was bet on the winner
      let betOnWinner = 0;
      if (current.player1 === winnerId) betOnWinner += current.p1Bet;
      if (current.player2 === winnerId) betOnWinner += current.p2Bet;
      
      const winningSpectators = fifa.spectators.filter(s => s.betOn === winnerId);
      winningSpectators.forEach(s => betOnWinner += s.amount);
      
      if (betOnWinner === 0) {
        // Impossible since player bet, but just in case
      } else {
        // Payout proportional
        const p1Win = current.player1 === winnerId ? (current.p1Bet / betOnWinner) * totalPool : 0;
        const p2Win = current.player2 === winnerId ? (current.p2Bet / betOnWinner) * totalPool : 0;
        
        if (p1Win > 0 && store.players[current.player1]) {
           store.players[current.player1].tokens += Math.floor(p1Win);
           io.to(store.players[current.player1].socketId).emit('player_update', store.players[current.player1]);
        }
        if (p2Win > 0 && store.players[current.player2]) {
           store.players[current.player2].tokens += Math.floor(p2Win);
           io.to(store.players[current.player2].socketId).emit('player_update', store.players[current.player2]);
        }

        winningSpectators.forEach(s => {
          const sWin = (s.amount / betOnWinner) * totalPool;
          if (store.players[s.id]) {
            store.players[s.id].tokens += Math.floor(sWin);
            io.to(store.players[s.id].socketId).emit('player_update', store.players[s.id]);
          }
        });
      }
    } else {
      // Refund everyone
      if (store.players[current.player1]) store.players[current.player1].tokens += current.p1Bet;
      if (store.players[current.player2]) store.players[current.player2].tokens += current.p2Bet;
      fifa.spectators.forEach(s => {
        if (store.players[s.id]) {
           store.players[s.id].tokens += s.amount;
           io.to(store.players[s.id].socketId).emit('player_update', store.players[s.id]);
        }
      });
      if (store.players[current.player1]) io.to(store.players[current.player1].socketId).emit('player_update', store.players[current.player1]);
      if (store.players[current.player2]) io.to(store.players[current.player2].socketId).emit('player_update', store.players[current.player2]);
    }

    broadcastLeaderboard();
    // Reset match
    fifa.currentMatch = null;
    fifa.spectators = [];
    checkFifaMatch(fifa);
  };
};
