class Store {
  constructor() {
    this.players = {}; // id -> { id, name, tokens, rebuys, socketId, connected }
    this.nameToId = {}; // name -> id (poor man's auth)
    
    // Games State
    this.games = {
      fifa: {
        queue: [], // { id, name, ready }
        currentMatch: null, // { player1: id, player2: id, pool: 0, p1Ready: false, p2Ready: false, p1Vote: null, p2Vote: null }
        spectators: [] // { id, betOn: id, amount: number }
      },
      babyfoot: {
        left: [], // max 4
        right: [], // max 4
        status: 'waiting', // waiting, playing, voting
        votes: { left: 0, right: 0 },
        pool: 0
      },
      bluff1: { active: null, state: 'waiting' }, // simplified initial state
      bluff2: { active: null, state: 'waiting' },
      blindtest: { pool: 0, buzzerActive: false, firstBuzzer: null },
      quidanslasalle: { question: null, pool: 0, answers: {}, status: 'waiting' }, // answers: { id: { percent, status, bet } }
      imposteur1: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '' },
      imposteur2: { players: [], state: 'waiting', roles: {}, majorityWord: '', undercoverWord: '' }
    };
    
    this.adminCode = 'GA-Dripbde-EBS89FHL';
  }

  getPlayer(id) {
    return this.players[id];
  }
  
  getPlayerBySocket(socketId) {
    return Object.values(this.players).find(p => p.socketId === socketId);
  }

  createPlayer(name, socketId) {
    if (this.nameToId[name]) {
      // Reconnect
      const id = this.nameToId[name];
      this.players[id].socketId = socketId;
      this.players[id].connected = true;
      return this.players[id];
    }
    
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newPlayer = {
      id,
      name,
      tokens: 100,
      rebuys: 2,
      socketId,
      connected: true,
      isAdmin: false
    };
    this.players[id] = newPlayer;
    this.nameToId[name] = id;
    return newPlayer;
  }

  disconnectPlayer(socketId) {
    const p = this.getPlayerBySocket(socketId);
    if (p) p.connected = false;
  }

  updateTokens(id, amount) {
    if (this.players[id]) {
      this.players[id].tokens += amount;
      return this.players[id].tokens;
    }
    return null;
  }

  rebuy(id) {
    const p = this.players[id];
    if (!p) return { success: false, error: "Player not found" };
    if (p.tokens >= 20) return { success: false, error: "Tokens must be < 20 for rebuy" };
    if (p.rebuys <= 0) return { success: false, error: "No rebuys left" };
    
    // Add cooldown check here if needed (e.g. store lastRebuy timestamp)
    if (p.lastRebuy && Date.now() - p.lastRebuy < 30 * 60 * 1000) {
      return { success: false, error: "Cooldown actif (30 min)" };
    }

    p.tokens += 40;
    p.rebuys -= 1;
    p.lastRebuy = Date.now();
    return { success: true, player: p };
  }
  
  getLeaderboard() {
    return Object.values(this.players)
      .filter(p => !p.isAdmin)
      .sort((a, b) => b.tokens - a.tokens)
      .map(p => ({ id: p.id, name: p.name, tokens: p.tokens }));
  }
}

module.exports = new Store();
