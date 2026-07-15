import { io } from "socket.io-client";
const socket = io("https://bde89-casino.onrender.com");
socket.on("connect", () => {
  socket.emit("join", { name: "Tester" }, (res) => {
    socket.emit("babyfoot_join", { side: "left" }, (res2) => {
      console.log("join babyfoot:", res2);
      socket.emit("u_join", { tableId: "imposteur1" }, (res3) => {
        console.log("join undercover:", res3);
        process.exit(0);
      });
    });
  });
});
