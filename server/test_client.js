const { io } = require("socket.io-client");
const socket = io("https://bde89-casino.onrender.com");
socket.on("connect", () => {
  console.log("connected");
  socket.emit("login", "Tester", (res) => {
    console.log("login res:", res);
    socket.emit("fifa_join_queue", (res2) => {
      console.log("join fifa:", res2);
      process.exit(0);
    });
  });
});
socket.on("connect_error", (err) => { console.error(err.message); process.exit(1); });
