module.exports = (io, socket, store, broadcastLeaderboard) => {
  const initQState = () => {
    if (!store.games.quidanslasalle.answers) {
      store.games.quidanslasalle = { status: 'waiting', question: null, answers: {} };
    }
  };

  const broadcastQ = () => {
    io.emit('game_update', { game: 'quidanslasalle', state: store.games.quidanslasalle });
  };

  socket.on('q_admin_start', ({ question }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p || !p.isAdmin) return;

    store.games.quidanslasalle = {
      status: 'answering',
      question,
      answers: {}
    };

    broadcastQ();
    if (callback) callback({ success: true });
  });

  // Players submit their answer (no bet required)
  socket.on('q_submit', ({ percent, isMe }, callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initQState();
    const q = store.games.quidanslasalle;

    if (!p || q.status !== 'answering') return;
    if (q.answers[p.id]) return callback({ success: false, error: 'Already submitted' });
    if (percent < 0 || percent > 100) return callback({ success: false, error: 'Percent must be 0-100' });

    q.answers[p.id] = { id: p.id, name: p.name, percent, isMe };

    broadcastQ();
    if (callback) callback({ success: true });
  });

  socket.on('q_admin_reveal', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    initQState();
    const q = store.games.quidanslasalle;

    if (!p || !p.isAdmin || q.status !== 'answering') return;

    q.status = 'revealed';

    const answersList = Object.values(q.answers);
    if (answersList.length > 0) {
      const moiCount = answersList.filter(a => a.isMe).length;
      const truePercent = Math.round((moiCount / answersList.length) * 100);
      q.truePercent = truePercent;

      // Find closest estimations
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

      // Each winner gets +10 tokens fixed reward
      winners.forEach(w => {
        if (store.players[w.id]) {
          store.players[w.id].tokens += 10;
          io.to(store.players[w.id].socketId).emit('player_update', store.players[w.id]);
        }
      });
    } else {
      q.truePercent = 0;
      q.winners = [];
    }

    broadcastLeaderboard();
    broadcastQ();
    if (callback) callback({ success: true });
    
    setTimeout(() => {
      if (store.games.quidanslasalle.status === 'revealed') {
        store.games.quidanslasalle = { status: 'waiting', question: null, answers: {} };
        broadcastQ();
      }
    }, 15000);
  });
};
