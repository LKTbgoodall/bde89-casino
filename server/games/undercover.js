module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initUState = (tableId) => {
    if (!store.games[tableId].players) {
      store.games[tableId] = { 
        state: 'waiting', // waiting, playing, mrwhite_guess, finished
        players: [], // { id, name, role, eliminated, votedFor }
        pool: 0,
        majorityWord: '',
        undercoverWord: '',
        turnOrder: [],
        currentTurnIndex: 0
      };
    }
  };

  const broadcastU = (tableId) => {
    // Send filtered state to players (hide roles of non-eliminated players)
    const rawState = store.games[tableId];
    const filteredState = {
      ...rawState,
      players: rawState.players.map(p => ({
        id: p.id,
        name: p.name,
        eliminated: p.eliminated,
        votedFor: p.votedFor,
        role: p.eliminated ? p.role : null // hide role if still playing!
      }))
    };
    
    // Admins get everything
    io.to('admins').emit('game_update_admin', { game: tableId, state: rawState });
    
    // Send to players individually so they see their own role
    rawState.players.forEach(p => {
      const pSocket = store.players[p.id] ? store.players[p.id].socketId : null;
      if (pSocket) {
        const playerState = JSON.parse(JSON.stringify(filteredState));
        const self = playerState.players.find(x => x.id === p.id);
        if (self) {
          self.role = p.role;
          self.word = getWordForRole(p.role, rawState);
        }
        io.to(pSocket).emit('game_update', { game: tableId, state: playerState });
      }
    });
    
    // For spectators/hub, send filtered
    io.to('players').emit('game_update_spectator', { game: tableId, state: filteredState });
  };

  const getWordForRole = (role, state) => {
    if (role === 'civil') return state.majorityWord;
    if (role === 'undercover') return state.undercoverWord;
    if (role === 'mrwhite') return '???';
    return '';
  };

  // Players join table
  socket.on('u_join', ({ tableId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p) return;

    store.leaveAllGames(p.id);

    initUState(tableId);
    const game = store.games[tableId];

    if (game.state !== 'waiting') return callback({ success: false, error: 'Game in progress' });
    if (game.players.find(x => x.id === p.id)) return callback({ success: false, error: 'Already joined' });

    if (p.tokens < 10) return callback({ success: false, error: 'Not enough tokens (need 10)' });

    game.players.push({ id: p.id, name: p.name, role: null, eliminated: false, votedFor: null });
    
    broadcastU(tableId);
    if (callback) callback({ success: true });
  });

  socket.on('u_leave', ({ tableId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initUState(tableId);
    const game = store.games[tableId];

    if (!p) return;
    if (game.state !== 'waiting') return callback({ success: false, error: 'Game in progress' });
    
    game.players = game.players.filter(x => x.id !== p.id);
    
    broadcastU(tableId);
    if (callback) callback({ success: true });
  });

  socket.on('u_admin_start', ({ tableId, majorityWord, undercoverWord, undercoverCount, hasMrWhite }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initUState(tableId);
    const game = store.games[tableId];

    if (!p || !p.isAdmin) return;
    if (game.state !== 'waiting') return;
    if (game.players.length < 3) return callback({ success: false, error: 'Not enough players' });

    // Collect bets
    game.pool = 0;
    game.players.forEach(player => {
       const sPlayer = store.players[player.id];
       if (sPlayer) {
          sPlayer.tokens -= 10;
          game.pool += 10;
          io.to(sPlayer.socketId).emit('player_update', sPlayer);
       }
    });

    game.majorityWord = majorityWord;
    game.undercoverWord = undercoverWord;
    
    // Assign roles randomly
    let roles = Array(game.players.length).fill('civil');
    let uCount = parseInt(undercoverCount) || 1;
    let mWhiteCount = hasMrWhite ? 1 : 0;
    
    for (let i=0; i<uCount; i++) roles[i] = 'undercover';
    for (let i=0; i<mWhiteCount; i++) roles[uCount + i] = 'mrwhite';
    
    roles = roles.sort(() => Math.random() - 0.5);
    
    game.players.forEach((player, i) => {
      player.role = roles[i];
      player.eliminated = false;
      player.votedFor = null;
    });

    // Randomize turn order
    game.turnOrder = game.players.map(x => x.id).sort(() => Math.random() - 0.5);
    game.state = 'playing';
    
    broadcastLeaderboard();
    broadcastU(tableId);
    if (callback) callback({ success: true });
  });

  // Vote to eliminate
  socket.on('u_vote', ({ tableId, targetId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initUState(tableId);
    const game = store.games[tableId];

    if (!p || game.state !== 'playing') return;
    const voter = game.players.find(x => x.id === p.id);
    const target = game.players.find(x => x.id === targetId);
    
    if (!voter || voter.eliminated || !target || target.eliminated) return;

    voter.votedFor = targetId;
    
    // Check if all alive players have voted
    const alivePlayers = game.players.filter(x => !x.eliminated);
    const allVoted = alivePlayers.every(x => x.votedFor !== null);

    if (allVoted) {
      resolveVotes(tableId, game, alivePlayers);
    } else {
      broadcastU(tableId);
    }
    
    if (callback) callback({ success: true });
  });

  const resolveVotes = (tableId, game, alivePlayers) => {
    const votes = {};
    alivePlayers.forEach(p => {
      votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
    });
    
    let maxVotes = 0;
    let eliminatedId = null;
    let tie = false;
    
    Object.entries(votes).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    });

    if (tie) {
      // Tie -> no one eliminated, reset votes
      alivePlayers.forEach(p => p.votedFor = null);
      // Wait for next vote or admin intervention
      broadcastU(tableId);
      return;
    }

    // Eliminate player
    const eliminatedPlayer = game.players.find(x => x.id === eliminatedId);
    eliminatedPlayer.eliminated = true;
    
    // Reset votes
    alivePlayers.forEach(p => p.votedFor = null);

    // Check Mr White logic
    if (eliminatedPlayer.role === 'mrwhite') {
       game.state = 'mrwhite_guess';
       game.mrWhiteId = eliminatedId;
       broadcastU(tableId);
       return;
    }

    checkWinCondition(tableId, game);
  };

  socket.on('u_mrwhite_guess', ({ tableId, guess }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initUState(tableId);
    const game = store.games[tableId];

    if (!p || game.state !== 'mrwhite_guess' || game.mrWhiteId !== p.id) return;

    // Check if guess is close enough (simple case insensitive exact match for now)
    // In real life, admin might need to judge, but we do auto
    const isCorrect = guess.toLowerCase().trim() === game.majorityWord.toLowerCase().trim();
    
    if (isCorrect) {
       endGame(tableId, game, 'mrwhite');
    } else {
       checkWinCondition(tableId, game); // Continue evaluating civils vs undercovers
    }
    if (callback) callback({ success: true });
  });

  socket.on('u_admin_judge_mrwhite', ({ tableId, isCorrect }, callback) => {
     // Admin override for Mr White guess
    const p = store.getPlayerBySocket(socket.id);
    initUState(tableId);
    const game = store.games[tableId];
    if (!p || !p.isAdmin || game.state !== 'mrwhite_guess') return;
    
    if (isCorrect) {
       endGame(tableId, game, 'mrwhite');
    } else {
       checkWinCondition(tableId, game);
    }
  });

  const checkWinCondition = (tableId, game) => {
    const alivePlayers = game.players.filter(x => !x.eliminated);
    const civilsAlive = alivePlayers.filter(x => x.role === 'civil').length;
    const undercoversAlive = alivePlayers.filter(x => x.role === 'undercover').length;
    const mrWhiteAlive = alivePlayers.filter(x => x.role === 'mrwhite').length;

    if (undercoversAlive === 0 && mrWhiteAlive === 0) {
      endGame(tableId, game, 'civil');
    } else if (undercoversAlive >= civilsAlive) {
      endGame(tableId, game, 'undercover');
    } else {
      // Game continues
      game.state = 'playing';
      broadcastU(tableId);
    }
  };

  const endGame = (tableId, game, winnerRole) => {
    game.state = 'finished';
    game.winnerRole = winnerRole;

    const winners = game.players.filter(p => p.role === winnerRole);
    if (winners.length > 0) {
       const share = Math.floor(game.pool / winners.length);
       winners.forEach(w => {
         if (store.players[w.id]) {
            store.players[w.id].tokens += share;
            io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
         }
       });
    }

    broadcastLeaderboard();
    broadcastU(tableId);
    
    // Auto reset
    setTimeout(() => {
       if (store.games[tableId].state === 'finished') {
          store.games[tableId] = { 
            state: 'waiting', 
            players: [], 
            pool: 0,
            majorityWord: '',
            undercoverWord: '',
            turnOrder: [],
            currentTurnIndex: 0
          };
          broadcastU(tableId);
       }
    }, 15000);
  };
  
  socket.on('u_admin_reset', ({ tableId }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p || !p.isAdmin) return;
    store.games[tableId] = { 
      state: 'waiting', players: [], pool: 0, majorityWord: '', undercoverWord: '', turnOrder: [], currentTurnIndex: 0
    };
    broadcastU(tableId);
    if (callback) callback({ success: true });
  });
};
