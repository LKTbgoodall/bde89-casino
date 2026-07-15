module.exports = (io, socket, store, broadcastLeaderboard) => {
  const broadcastBabyfoot = () => {
    io.emit('game_update', { game: 'babyfoot', state: store.games.babyfoot });
  };

  socket.on('babyfoot_join', ({ side }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p) return;

    store.leaveAllGames(p.id, io);

    const bf = store.games.babyfoot;
    if (bf.status !== 'waiting') return callback({ success: false, error: 'Match already in progress' });
    if (bf.left.find(x => x.id === p.id) || bf.right.find(x => x.id === p.id)) {
      return callback({ success: false, error: 'Already joined' });
    }

    if (side === 'left') {
      if (bf.left.length >= 4) return callback({ success: false, error: 'Left team full' });
      bf.left.push({ id: p.id, name: p.name, bet: 0, vote: null });
    } else {
      if (bf.right.length >= 4) return callback({ success: false, error: 'Right team full' });
      bf.right.push({ id: p.id, name: p.name, bet: 0, vote: null });
    }

    // Auto start if 8 players
    if (bf.left.length === 4 && bf.right.length === 4) {
      bf.status = 'betting';
    }

    broadcastBabyfoot();
    if (callback) callback({ success: true });
  });

  socket.on('babyfoot_admin_start', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const bf = store.games.babyfoot;
    if (!p || !p.isAdmin) return;
    if (bf.status !== 'waiting' || (bf.left.length === 0 && bf.right.length === 0)) return;
    
    bf.status = 'betting';
    broadcastBabyfoot();
    if (callback) callback({ success: true });
  });

  socket.on('babyfoot_bet', ({ amount }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const bf = store.games.babyfoot;
    if (!p || bf.status !== 'betting') return;

    if (amount < 5 || amount > 20 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }

    let playerObj = bf.left.find(x => x.id === p.id) || bf.right.find(x => x.id === p.id);
    if (!playerObj || playerObj.bet > 0) return; // already bet

    p.tokens -= amount;
    playerObj.bet = amount;
    bf.pool += amount;

    socket.emit('player_update', p);
    broadcastLeaderboard();

    // Check if everyone has bet
    const allBet = [...bf.left, ...bf.right].every(x => x.bet > 0);
    if (allBet) {
      bf.status = 'playing';
    }

    broadcastBabyfoot();
    if (callback) callback({ success: true });
  });

  socket.on('babyfoot_submit_vote', ({ winnerSide }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const bf = store.games.babyfoot;
    if (!p || bf.status !== 'playing') return;

    let playerObj = bf.left.find(x => x.id === p.id) || bf.right.find(x => x.id === p.id);
    if (!playerObj || playerObj.vote) return; // already voted

    playerObj.vote = winnerSide;
    
    // Check if all voted
    const allPlayers = [...bf.left, ...bf.right];
    const allVoted = allPlayers.every(x => x.vote);

    if (allVoted) {
      // Tally votes
      let leftVotes = allPlayers.filter(x => x.vote === 'left').length;
      let rightVotes = allPlayers.filter(x => x.vote === 'right').length;
      
      const threshold = Math.ceil(allPlayers.length * 0.75); // 6 out of 8, or 3 out of 4
      
      if (leftVotes >= threshold) {
        resolveBabyfoot('left', bf);
      } else if (rightVotes >= threshold) {
        resolveBabyfoot('right', bf);
      } else {
        // Null or litige
        resolveBabyfoot(null, bf);
        io.to('admins').emit('sos_alert', { 
          playerName: 'BabyFoot System', 
          table: 'Désaccord Baby Foot (Votes L:' + leftVotes + ' R:' + rightVotes + ')'
        });
      }
    } else {
       broadcastBabyfoot();
    }
    
    if (callback) callback({ success: true });
  });

  const resolveBabyfoot = (winnerSide, bf) => {
    if (winnerSide) {
      const winners = winnerSide === 'left' ? bf.left : bf.right;
      const totalWinnersBet = winners.reduce((sum, p) => sum + p.bet, 0);
      
      if (totalWinnersBet > 0) {
        winners.forEach(w => {
          const winShare = (w.bet / totalWinnersBet) * bf.pool;
          if (store.players[w.id]) {
            store.players[w.id].tokens += Math.floor(winShare);
            io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
          }
        });
      }
    } else {
      // Refund
      [...bf.left, ...bf.right].forEach(w => {
        if (store.players[w.id]) {
            store.players[w.id].tokens += w.bet;
            io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
        }
      });
    }

    broadcastLeaderboard();
    // Reset
    bf.left = [];
    bf.right = [];
    bf.status = 'waiting';
    bf.pool = 0;
    broadcastBabyfoot();
  };
};
