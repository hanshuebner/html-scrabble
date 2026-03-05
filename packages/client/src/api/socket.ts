import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io({
      withCredentials: true,
      autoConnect: false,
    })
  }
  return socket
}

export const joinGame = (gameKey: string, playerKey?: string): Promise<boolean> => {
  const s = getSocket()
  if (!s.connected) s.connect()
  return new Promise((resolve) => {
    s.emit('join', { gameKey, playerKey }, (ok: boolean) => resolve(ok))
  })
}

export const sendMessage = (gameKey: string, playerName: string, message: string): void => {
  getSocket().emit('message', { gameKey, playerName, message })
}
