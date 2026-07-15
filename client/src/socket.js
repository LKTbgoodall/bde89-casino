import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: true, // Connect immediately so the server wakes up ASAP
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});
