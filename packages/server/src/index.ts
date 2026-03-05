import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { sql } from 'drizzle-orm'
import { config } from './config.js'
import { db } from './db/connection.js'
import { gameRoutes } from './game/game-routes.js'
import { statsRoutes } from './stats/stats-routes.js'
import { setupGameSocket } from './game/game-socket.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.join(__dirname, '../../client/dist')

const app = express()
const server = createServer(app)
const io = new Server(server)

app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/games', gameRoutes)
app.use('/api/stats', statsRoutes)

// Serve client static files
app.use(express.static(clientDist))

// Socket.IO
setupGameSocket(io)

// SPA fallback — serve index.html for all non-API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// DB health check
db.execute(sql`SELECT 1`)
  .then(() => console.log('[DB] PostgreSQL connection OK'))
  .catch((err) => console.error('[DB] PostgreSQL connection failed:', err))

server.listen(config.port, () => {
  console.log(`Scrabble server running on port ${config.port}`)
})

export { app, io, server }
