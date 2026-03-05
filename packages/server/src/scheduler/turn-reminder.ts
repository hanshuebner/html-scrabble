import { config } from '../config.js'
import { findActiveGames } from '../db/game-repository.js'
import { timeoutGame, makeGameLink } from '../game/game-service.js'
import { sendTurnReminder } from '../email/email-service.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const processGameReminders = async (): Promise<void> => {
  const { reminderAfterDays, timeoutAfterDays } = config.reminder
  const now = Date.now()

  const activeGames = await findActiveGames()
  console.log(`[scheduler] Checking ${activeGames.length} active games`)

  for (const game of activeGames) {
    const daysSinceUpdate = (now - game.updatedAt.getTime()) / MS_PER_DAY

    if (daysSinceUpdate > timeoutAfterDays) {
      await timeoutGame(game.key)
    } else if (daysSinceUpdate > reminderAfterDays && game.whosTurn !== null) {
      const currentPlayer = game.players.find((p) => p.playerIndex === game.whosTurn)
      if (!currentPlayer) continue

      const otherNames = game.players.filter((p) => p.playerIndex !== game.whosTurn).map((p) => p.name)
      const link = makeGameLink(game.key, currentPlayer.key)

      await sendTurnReminder(currentPlayer.email, currentPlayer.name, link, otherNames)
      console.log(`[scheduler] Sent turn reminder for game ${game.key} to ${currentPlayer.name}`)
    }
  }
}
