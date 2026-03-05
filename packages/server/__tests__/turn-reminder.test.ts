import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeGameLink } from '../src/game/game-service.js'

vi.mock('../src/db/game-repository.js', () => ({
  findActiveGames: vi.fn(),
}))

vi.mock('../src/game/game-service.js', () => ({
  timeoutGame: vi.fn(),
  makeGameLink: vi.fn(
    (gameKey: string, playerKey: string) => `http://localhost:3000/game/${gameKey}/${playerKey}`,
  ),
}))

vi.mock('../src/email/email-service.js', () => ({
  sendTurnReminder: vi.fn(),
}))

vi.mock('../src/config.js', () => ({
  config: {
    reminder: {
      reminderAfterDays: 2,
      timeoutAfterDays: 14,
    },
  },
}))

import { processGameReminders } from '../src/scheduler/turn-reminder.js'
import { findActiveGames } from '../src/db/game-repository.js'
import { timeoutGame } from '../src/game/game-service.js'
import { sendTurnReminder } from '../src/email/email-service.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const makeGame = (overrides: {
  key?: string
  daysAgo: number
  whosTurn?: number | null
  players?: { playerIndex: number; name: string; email: string; key: string }[]
}) => ({
  key: overrides.key ?? 'game1',
  language: 'English',
  whosTurn: overrides.whosTurn === undefined ? 0 : overrides.whosTurn,
  createdAt: new Date(Date.now() - overrides.daysAgo * MS_PER_DAY),
  updatedAt: new Date(Date.now() - overrides.daysAgo * MS_PER_DAY),
  players: overrides.players ?? [
    { playerIndex: 0, name: 'Alice', email: 'alice@test.com', key: 'key-alice' },
    { playerIndex: 1, name: 'Bob', email: 'bob@test.com', key: 'key-bob' },
  ],
})

describe('processGameReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(makeGameLink).mockImplementation(
      (gameKey: string, playerKey?: string) => `http://localhost:3000/game/${gameKey}/${playerKey}`,
    )
  })

  it('does nothing for recently active games', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ daysAgo: 1 })])

    await processGameReminders()

    expect(timeoutGame).not.toHaveBeenCalled()
    expect(sendTurnReminder).not.toHaveBeenCalled()
  })

  it('sends reminder for games idle longer than reminderAfterDays', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ daysAgo: 3 })])

    await processGameReminders()

    expect(timeoutGame).not.toHaveBeenCalled()
    expect(sendTurnReminder).toHaveBeenCalledOnce()
    expect(sendTurnReminder).toHaveBeenCalledWith(
      'alice@test.com',
      'Alice',
      'http://localhost:3000/game/game1/key-alice',
      ['Bob'],
    )
  })

  it('times out games idle longer than timeoutAfterDays', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ key: 'old-game', daysAgo: 15 })])

    await processGameReminders()

    expect(timeoutGame).toHaveBeenCalledOnce()
    expect(timeoutGame).toHaveBeenCalledWith('old-game')
    expect(sendTurnReminder).not.toHaveBeenCalled()
  })

  it('sends reminder to the current player based on whosTurn', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ daysAgo: 5, whosTurn: 1 })])

    await processGameReminders()

    expect(sendTurnReminder).toHaveBeenCalledWith(
      'bob@test.com',
      'Bob',
      'http://localhost:3000/game/game1/key-bob',
      ['Alice'],
    )
  })

  it('skips reminder when whosTurn is null', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ daysAgo: 5, whosTurn: null })])

    await processGameReminders()

    expect(sendTurnReminder).not.toHaveBeenCalled()
    expect(timeoutGame).not.toHaveBeenCalled()
  })

  it('handles multiple games with different states', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([
      makeGame({ key: 'fresh', daysAgo: 0 }),
      makeGame({ key: 'idle', daysAgo: 4 }),
      makeGame({ key: 'stale', daysAgo: 20 }),
    ])

    await processGameReminders()

    expect(timeoutGame).toHaveBeenCalledOnce()
    expect(timeoutGame).toHaveBeenCalledWith('stale')
    expect(sendTurnReminder).toHaveBeenCalledOnce()
    expect(sendTurnReminder).toHaveBeenCalledWith(
      'alice@test.com',
      'Alice',
      'http://localhost:3000/game/idle/key-alice',
      ['Bob'],
    )
  })

  it('handles no active games', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([])

    await processGameReminders()

    expect(timeoutGame).not.toHaveBeenCalled()
    expect(sendTurnReminder).not.toHaveBeenCalled()
  })

  it('handles game at exactly the boundary (not triggered)', async () => {
    vi.mocked(findActiveGames).mockResolvedValue([makeGame({ daysAgo: 2 })])

    await processGameReminders()

    expect(sendTurnReminder).not.toHaveBeenCalled()
    expect(timeoutGame).not.toHaveBeenCalled()
  })
})
