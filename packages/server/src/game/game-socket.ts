import type { Server } from 'socket.io';
import { loadGame, lookupPlayer, setNotifyFn } from './game-service.js';

export function setupGameSocket(io: Server): void {
  // Wire up the notify function so game-service can broadcast
  setNotifyFn((gameKey, event, data) => {
    io.to(`game:${gameKey}`).emit(event, data);
  });

  io.on('connection', (socket) => {
    socket.on('join', async (data: { gameKey: string; playerKey?: string }) => {
      const game = await loadGame(data.gameKey);
      if (!game) {
        console.log(`[socket] game ${data.gameKey} not found`);
        return;
      }

      socket.join(`game:${data.gameKey}`);

      // If the player identifies themselves, broadcast their join
      if (data.playerKey) {
        const player = lookupPlayer(game, data.playerKey);
        if (player) {
          socket.data.playerIndex = player.index;
          socket.data.gameKey = data.gameKey;

          // Tell the joining player about other connected players
          const room = io.sockets.adapter.rooms.get(`game:${data.gameKey}`);
          if (room) {
            for (const socketId of room) {
              if (socketId !== socket.id) {
                const otherSocket = io.sockets.sockets.get(socketId);
                if (otherSocket?.data.playerIndex !== undefined) {
                  socket.emit('join', otherSocket.data.playerIndex);
                }
              }
            }
          }

          // Tell others this player joined
          socket.to(`game:${data.gameKey}`).emit('join', player.index);
        }
      }
    });

    socket.on('message', (data: { gameKey: string; message: string; playerName: string }) => {
      io.to(`game:${data.gameKey}`).emit('message', {
        playerName: data.playerName,
        message: data.message,
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.gameKey && socket.data.playerIndex !== undefined) {
        socket.to(`game:${socket.data.gameKey}`).emit('leave', socket.data.playerIndex);
      }
    });
  });
}
