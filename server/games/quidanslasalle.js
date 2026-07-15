module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initQState = () => {
    if (!store.games.quidanslasalle.answers) {
      store.games.quidanslasalle = { status: 'waiting', question: null, pool: 0, answers: {} };
    }
  };

  const broadcastQ = () => {
    io.emit('game_update', { game: 'quidanslasalle', state: store.games.quidanslasalle });
  };

  socket.on('q_admin_start', ({ question }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p || !p.isAdmin) return;

    store.games.quidanslasalle = {
      status: 'betting',
      question,
      pool: 0,
      answers: {}
    };

    broadcastQ();
    if (callback) callback({ success: true });
  });

  socket.on('q_submit', ({ bet, percent, isMe }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initQState();
    const q = store.games.quidanslasalle;

    if (!p || q.status !== 'betting') return;
    if (q.answers[p.id]) return callback({ success: false, error: 'Already submitted' });

    if (bet < 2 || bet > 15 || bet > p.tokens * 0.5) {
      return callback && callback({ success: false, error: 'Invalid bet amount' });
    }
    if (percent < 0 || percent > 100) return callback({ success: false, error: 'Percent must be 0-100' });

    p.tokens -= bet;
    q.pool += bet;
    q.answers[p.id] = { id: p.id, name: p.name, bet, percent, isMe };

    socket.emit('player_update', p);
    broadcastLeaderboard();
    broadcastQ();
    if (callback) callback({ success: true });
  });

  socket.on('q_admin_reveal', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initQState();
    const q = store.games.quidanslasalle;

    if (!p || !p.isAdmin || q.status !== 'betting') return;

    q.status = 'revealed';

    const answersList = Object.values(q.answers);
    if (answersList.length > 0) {
      const moiCount = answersList.filter(a => a.isMe).length;
      const truePercent = Math.round((moiCount / answersList.length) * 100);
      q.truePercent = truePercent;

      // Find closest
      let minDiff = 100;
      let winners = [];

      answersList.forEach(a => {
        const diff = Math.abs(a.percent - truePercent);
        if (diff < minDiff) {
          minDiff = diff;
          winners = [a];
        } else if (diff === minDiff) {
          winners.push(a);
        }
      });

      q.winners = winners.map(w => w.id);

      // Distribute pool to winners
      if (winners.length > 0) {
        const share = Math.floor(q.pool / winners.length);
        winners.forEach(w => {
          if (store.players[w.id]) {
            store.players[w.id].tokens += share;
            io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
          }
        });
      }
    } else {
      q.truePercent = 0;
      q.winners = [];
    }

    broadcastLeaderboard();
    broadcastQ();
    if (callback) callback({ success: true });
    
    setTimeout(() => {
      if (store.games.quidanslasalle.status === 'revealed') {
        store.games.quidanslasalle = { status: 'waiting', question: null, pool: 0, answers: {} };
        broadcastQ();
      }
    }, 15000);
  });
};
