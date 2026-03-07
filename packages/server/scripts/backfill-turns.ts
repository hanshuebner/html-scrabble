/**
 * Backfill turns for imported legacy games.
 *
 * Usage:
 *   cd packages/server
 *   npx tsx scripts/backfill-turns.ts <path-to-migrated.json>
 *
 * This script:
 * 1. Finds all imported legacy games (matched by key in the migrated JSON)
 * 2. Skips games that have been modified since import (turn count differs from legacy data)
 * 3. Deletes existing (potentially malformed) turns and re-inserts with correct move_data format
 */

import { readFileSync } from 'fs'
import { eq, sql } from 'drizzle-orm'
import { db } from '../src/db/connection.js'
import { turns } from '../src/db/schema.js'

const backfill = async () => {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Usage: npx tsx scripts/backfill-turns.ts <path-to-migrated.json>')
    process.exit(1)
  }

  const migrated: any[] = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  const migratedByKey = new Map<string, any>()
  for (const g of migrated) {
    migratedByKey.set(g.key, g)
  }

  // Find all games that exist in the migrated JSON, with their current turn count
  const allGames = await db.execute<{ id: string; key: string; turn_count: string }>(sql`
    SELECT g.id, g.key, COUNT(t.id)::text AS turn_count
    FROM games g
    LEFT JOIN turns t ON t.game_id = g.id
    WHERE g.key = ANY(${Array.from(migratedByKey.keys())})
    GROUP BY g.id, g.key
  `)

  console.log(`Found ${allGames.length} legacy games in DB`)
  console.log(`Loaded ${migratedByKey.size} games from migrated JSON`)

  let backfilled = 0
  let skipped = 0
  let errors = 0

  for (const game of allGames) {
    const legacy = migratedByKey.get(game.key)
    if (!legacy || !legacy.turns || legacy.turns.length === 0) {
      skipped++
      continue
    }

    const dbTurnCount = parseInt(game.turn_count, 10)
    // Skip games where turn count differs from legacy data — they've been modified since import
    if (dbTurnCount !== 0 && dbTurnCount !== legacy.turns.length) {
      skipped++
      continue
    }

    try {
      const values = legacy.turns.map((t: any, i: number) => {
        const importedMove = t.moveData || {}
        // Normalize to match new game format: { type, player, score, move, placements }
        const moveData: Record<string, unknown> = {
          type: t.type,
          player: t.player,
          score: t.score,
        }
        if (importedMove.words) moveData.move = { words: importedMove.words }
        if (importedMove.placements) moveData.placements = importedMove.placements
        if (t.timestamp) moveData.timestamp = t.timestamp

        return {
          gameId: game.id,
          turnNumber: i,
          playerIndex: t.player,
          type: t.type,
          score: t.score,
          moveData,
        }
      })

      // Delete existing malformed turns and re-insert
      await db.delete(turns).where(eq(turns.gameId, game.id))
      await db.insert(turns).values(values)
      backfilled++
      if (backfilled % 50 === 0) console.log(`  ... backfilled ${backfilled} games`)
    } catch (e: any) {
      errors++
      console.error(`  Error backfilling ${game.key}: ${e.message}`)
    }
  }

  console.log(`\nDone: ${backfilled} games backfilled, ${skipped} skipped (no matching data or modified since import), ${errors} errors`)
  process.exit(0)
}

backfill()
