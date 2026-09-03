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
      bf.left.push({ id: p.id, name: p.name, vote: null });
    } else {
      if (bf.right.length >= 4) return callback({ success: false, error: 'Right team full' });
      bf.right.push({ id: p.id, name: p.name, vote: null });
    }

    // Auto start if 8 players
    if (bf.left.length === 4 && bf.right.length === 4) {
      bf.status = 'playing';
    }

    broadcastBabyfoot();
    if (callback) callback({ success: true });
  });

  socket.on('babyfoot_admin_start', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const bf = store.games.babyfoot;
    if (!p || !p.isAdmin) return;
    if (bf.status !== 'waiting' || (bf.left.length === 0 && bf.right.length === 0)) return;
    
    bf.status = 'playing';
    broadcastBabyfoot();
    if (callback) callback({ success: true });
  });

  // Spectators can bet on which team wins
  socket.on('babyfoot_spectator_bet', ({ amount, betOnSide }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    const bf = store.games.babyfoot;

    // Can't be on a team
    const isParticipant = bf.left.find(x => x.id === p.id) || bf.right.find(x => x.id === p.id);
    if (!p || bf.status !== 'playing' || isParticipant) {
      return callback && callback({ success: false, error: 'Cannot bet' });
    }
    if (bf.spectatorBets?.find(b => b.id === p.id)) {
      return callback && callback({ success: false, error: 'Already bet' });
    }
    if (amount < 2 || amount > 15 || amount > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount (2-15)' });
    }

    p.tokens -= amount;
    bf.spectatorBets = bf.spectatorBets ?? [];
    bf.spectatorBets.push({ id: p.id, name: p.name, betOn: betOnSide, amount });
    bf.spectatorPool = (bf.spectatorPool ?? 0) + amount;

    socket.emit('player_update', p);
    broadcastLeaderboard();
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
      
      // Each winner gets +15 tokens fixed reward
      winners.forEach(w => {
        if (store.players[w.id]) {
          store.players[w.id].tokens += 15;
          io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
        }
      });

      // Spectators who bet on winner get x2 their bet back
      if (bf.spectatorBets?.length > 0) {
        const winningSpecs = bf.spectatorBets.filter(b => b.betOn === winnerSide);
        winningSpecs.forEach(b => {
          if (store.players[b.id]) {
            store.players[b.id].tokens += b.amount * 2;
            io.to(store.players[b.id].socketId).emit('player_update', store.players[b.id]);
          }
        });
      }
    } else {
      // Litige: refund spectators only (no player bets to refund)
      if (bf.spectatorBets?.length > 0) {
        bf.spectatorBets.forEach(b => {
          if (store.players[b.id]) {
            store.players[b.id].tokens += b.amount;
            io.to(store.players[b.id].socketId).emit('player_update', store.players[b.id]);
          }
        });
      }
    }

    broadcastLeaderboard();
    // Reset
    bf.left = [];
    bf.right = [];
    bf.status = 'waiting';
    bf.spectatorBets = [];
    bf.spectatorPool = 0;
    broadcastBabyfoot();
  };
};
