import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function joinGame(gameKey: string, playerKey?: string): void {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join', { gameKey, playerKey });
}

export function sendMessage(gameKey: string, playerName: string, message: string): void {
  getSocket().emit('message', { gameKey, playerName, message });
}
