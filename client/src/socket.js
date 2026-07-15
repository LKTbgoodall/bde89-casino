import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false // We will connect manually when the app mounts or when the user logs in
});
