import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { sql } from 'drizzle-orm'
import yaml from 'js-yaml'
import { config } from './config.js'
import { db } from './db/connection.js'
import { gameRoutes } from './game/game-routes.js'
import { statsRoutes } from './stats/stats-routes.js'
import { setupGameSocket } from './game/game-socket.js'
import { startScheduler } from './scheduler/index.js'

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

// Validate i18n locale files
const validateLocales = () => {
  const localesDir = path.join(clientDist, 'locales')
  if (!fs.existsSync(localesDir)) return

  const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.yaml'))
  if (files.length === 0) return

  const bundles: Record<string, Record<string, string>> = {}

  for (const file of files) {
    const filePath = path.join(localesDir, file)
    const lng = file.replace('.yaml', '')
    try {
      bundles[lng] = yaml.load(fs.readFileSync(filePath, 'utf-8')) as Record<string, string>
    } catch (e: any) {
      console.error(`[i18n] Failed to parse ${file}: ${e.message}`)
    }
  }

  if (!bundles.en) return

  const enKeys = Object.keys(bundles.en)
  for (const [lng, bundle] of Object.entries(bundles)) {
    if (lng === 'en') continue
    const missing = enKeys.filter((k) => !(k in bundle))
    const extra = Object.keys(bundle).filter((k) => !(k in bundles.en))
    if (missing.length) console.warn(`[i18n] ${lng}: missing keys: ${missing.join(', ')}`)
    if (extra.length) console.warn(`[i18n] ${lng}: extra keys: ${extra.join(', ')}`)
  }

  console.log(`[i18n] Validated ${files.length} locale file(s): ${files.join(', ')}`)
}
validateLocales()

// DB health check
db.execute(sql`SELECT 1`)
  .then(() => console.log('[DB] PostgreSQL connection OK'))
  .catch((err) => console.error('[DB] PostgreSQL connection failed:', err))

server.listen(config.port, () => {
  console.log(`Scrabble server running on port ${config.port}`)
  startScheduler()
})

export { app, io, server }
