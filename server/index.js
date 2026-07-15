const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const store = require('./state');

// Game modules
const fifaHandler = require('./games/fifa');
const babyfootHandler = require('./games/babyfoot');
const bluffHandler = require('./games/bluff');
const blindtestHandler = require('./games/blindtest');
const quidanslasalleHandler = require('./games/quidanslasalle');
const undercoverHandler = require('./games/undercover');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Broadcast the current leaderboard to all clients (or admins)
const broadcastLeaderboard = () => {
  io.emit('leaderboard_update', store.getLeaderboard());
};

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // LOGIN / JOIN
  socket.on('join', ({ name, adminCode }, callback) => {
    if (!name) return callback({ success: false, error: 'Name is required' });

    const player = store.createPlayer(name, socket.id);
    
    // Check if admin
    if (adminCode === store.adminCode) {
      player.isAdmin = true;
    }

    socket.join(player.isAdmin ? 'admins' : 'players');
    
    // Send back full state
    callback({
      success: true,
      player,
      games: store.games,
      leaderboard: store.getLeaderboard()
    });

    broadcastLeaderboard();
  });

  // ADMIN SOS
  socket.on('sos', ({ table }) => {
    const player = store.getPlayerBySocket(socket.id);
    if (!player) return;
    io.to('admins').emit('sos_alert', { 
      playerName: player.name, 
      table 
    });
  });

  // REBUY
  socket.on('rebuy', (callback) => {
    const p = store.getPlayerBySocket(socket.id);
    if (!p) return callback({ success: false, error: 'Not found' });
    
    const res = store.rebuy(p.id);
    if (res.success) {
      // Notify player of new token amount
      socket.emit('player_update', res.player);
      broadcastLeaderboard();
      callback({ success: true, player: res.player });
    } else {
      callback(res);
    }
  });

  // MANUAL TOKEN UPDATE (ADMIN ONLY)
  socket.on('admin_update_tokens', ({ targetPlayerId, amount }, callback) => {
    const admin = store.getPlayerBySocket(socket.id);
    if (!admin || !admin.isAdmin) return callback({ success: false });

    const p = store.getPlayer(targetPlayerId);
    if (p) {
      p.tokens += amount;
      io.to(p.socketId).emit('player_update', p);
      broadcastLeaderboard();
      callback({ success: true, tokens: p.tokens });
    }
  });

  // Delegate events to game handlers
  fifaHandler(io, socket, store, broadcastLeaderboard);
  babyfootHandler(io, socket, store, broadcastLeaderboard);
  bluffHandler(io, socket, store, broadcastLeaderboard);
  blindtestHandler(io, socket, store, broadcastLeaderboard);
  quidanslasalleHandler(io, socket, store, broadcastLeaderboard);
  undercoverHandler(io, socket, store, broadcastLeaderboard);

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    store.disconnectPlayer(socket.id);
    // Don't broadcast leaderboard immediately on disconnect to avoid spam, 
    // or do it if we want to show online status.
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
