import { describe, it, expect, beforeEach } from 'vitest'
import { useGameState } from '../src/game/hooks/useGameState.js'
import type { SquareData } from '../src/game/hooks/useGameState.js'

const makeEmptyBoard = (): SquareData[][] => {
  const board: SquareData[][] = []
  for (let x = 0; x < 15; x++) {
    board[x] = []
    for (let y = 0; y < 15; y++) {
      board[x][y] = { type: 'Normal', x, y, tile: null, tileLocked: false }
    }
  }
  return board
}

const setupGame = () => {
  const store = useGameState
  store.getState().setGameData(
    {
      key: 'test-game',
      language: 'English',
      whosTurn: 0,
      legalLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      remainingTileCounts: { letterBag: 80, players: [7, 7] },
      board: makeEmptyBoard(),
      turns: [],
      players: [
        {
          name: 'Alice',
          score: 0,
          rack: [
            { tile: { letter: 'A', score: 1 } },
            { tile: { letter: 'B', score: 3 } },
            { tile: { letter: 'C', score: 3 } },
            { tile: { letter: ' ', score: 0 } }, // blank tile
            { tile: { letter: 'E', score: 1 } },
            { tile: { letter: 'F', score: 4 } },
            { tile: { letter: 'G', score: 2 } },
          ],
        },
        { name: 'Bob', score: 0, rack: null },
      ],
    },
    'player-key',
  )
  return store.getState
}

const getRackTiles = (getState: () => ReturnType<typeof useGameState.getState>) => {
  const state = getState()
  return state.players[state.playerIndex!].rack!
}

describe('useGameState placement behavior', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useGameState.setState({
      gameKey: null,
      playerKey: null,
      playerIndex: null,
      board: null,
      players: [],
      turns: [],
      whosTurn: null,
      pendingPlacements: [],
      error: null,
    })
  })

  describe('addPendingPlacement', () => {
    it('adds a regular tile placement and nulls the rack slot', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const slotId = rack[0].id // 'A' tile

      getState().addPendingPlacement({
        letter: 'A',
        score: 1,
        x: 7,
        y: 7,
        blank: false,
        rackSlotId: slotId,
      })

      const state = getState()
      expect(state.pendingPlacements).toHaveLength(1)
      expect(state.pendingPlacements[0]).toMatchObject({
        letter: 'A',
        score: 1,
        x: 7,
        y: 7,
        blank: false,
      })

      // Rack slot should be emptied
      const updatedRack = getRackTiles(getState)
      const slot = updatedRack.find((s) => s.id === slotId)!
      expect(slot.tile).toBeNull()
    })

    it('adds a blank tile placement with chosen letter and nulls the rack slot', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const blankSlot = rack.find((s) => s.tile?.score === 0)!

      getState().addPendingPlacement({
        letter: 'Z', // chosen letter
        score: 0,
        x: 7,
        y: 7,
        blank: true,
        rackSlotId: blankSlot.id,
      })

      const state = getState()
      expect(state.pendingPlacements).toHaveLength(1)
      expect(state.pendingPlacements[0]).toMatchObject({
        letter: 'Z',
        score: 0,
        blank: true,
      })

      // Rack slot should be emptied
      const updatedRack = getRackTiles(getState)
      const slot = updatedRack.find((s) => s.id === blankSlot.id)!
      expect(slot.tile).toBeNull()
    })
  })

  describe('removePendingPlacement', () => {
    it('restores a regular tile to its rack slot with original letter and score', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const slotId = rack[1].id // 'B' tile, score 3

      getState().addPendingPlacement({
        letter: 'B',
        score: 3,
        x: 7,
        y: 7,
        blank: false,
        rackSlotId: slotId,
      })

      const returnedSlotId = getState().removePendingPlacement(7, 7)
      expect(returnedSlotId).toBe(slotId)

      // Placement removed
      expect(getState().pendingPlacements).toHaveLength(0)

      // Tile restored with original letter and score
      const restoredSlot = getRackTiles(getState).find((s) => s.id === slotId)!
      expect(restoredSlot.tile).toEqual({ letter: 'B', score: 3 })
    })

    it('restores a blank tile to its rack slot with cleared letter', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const blankSlot = rack.find((s) => s.tile?.score === 0)!

      getState().addPendingPlacement({
        letter: 'X', // chosen letter for this placement
        score: 0,
        x: 7,
        y: 7,
        blank: true,
        rackSlotId: blankSlot.id,
      })

      getState().removePendingPlacement(7, 7)

      // Blank tile restored with cleared letter (space) and score 0
      const restoredSlot = getRackTiles(getState).find((s) => s.id === blankSlot.id)!
      expect(restoredSlot.tile).toEqual({ letter: ' ', score: 0 })
    })

    it('returns empty string when no placement at coordinates', () => {
      const getState = setupGame()
      const result = getState().removePendingPlacement(0, 0)
      expect(result).toBe('')
    })
  })

  describe('clearPendingPlacements', () => {
    it('restores all tiles to their rack slots', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const slotA = rack[0] // 'A', score 1
      const slotB = rack[1] // 'B', score 3

      getState().addPendingPlacement({
        letter: 'A',
        score: 1,
        x: 7,
        y: 7,
        blank: false,
        rackSlotId: slotA.id,
      })
      getState().addPendingPlacement({
        letter: 'B',
        score: 3,
        x: 8,
        y: 7,
        blank: false,
        rackSlotId: slotB.id,
      })
      expect(getState().pendingPlacements).toHaveLength(2)

      getState().clearPendingPlacements()

      expect(getState().pendingPlacements).toHaveLength(0)
      const updatedRack = getRackTiles(getState)
      expect(updatedRack.find((s) => s.id === slotA.id)!.tile).toEqual({ letter: 'A', score: 1 })
      expect(updatedRack.find((s) => s.id === slotB.id)!.tile).toEqual({ letter: 'B', score: 3 })
    })

    it('restores blank tiles with cleared letter', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const blankSlot = rack.find((s) => s.tile?.score === 0)!

      getState().addPendingPlacement({
        letter: 'Q',
        score: 0,
        x: 7,
        y: 7,
        blank: true,
        rackSlotId: blankSlot.id,
      })

      getState().clearPendingPlacements()

      const restoredSlot = getRackTiles(getState).find((s) => s.id === blankSlot.id)!
      expect(restoredSlot.tile).toEqual({ letter: ' ', score: 0 })
    })

    it('restores mixed regular and blank tiles correctly', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)
      const regularSlot = rack[0] // 'A', score 1
      const blankSlot = rack.find((s) => s.tile?.score === 0)!

      getState().addPendingPlacement({
        letter: 'A',
        score: 1,
        x: 7,
        y: 7,
        blank: false,
        rackSlotId: regularSlot.id,
      })
      getState().addPendingPlacement({
        letter: 'M',
        score: 0,
        x: 8,
        y: 7,
        blank: true,
        rackSlotId: blankSlot.id,
      })

      getState().clearPendingPlacements()

      const updatedRack = getRackTiles(getState)
      expect(updatedRack.find((s) => s.id === regularSlot.id)!.tile).toEqual({ letter: 'A', score: 1 })
      expect(updatedRack.find((s) => s.id === blankSlot.id)!.tile).toEqual({ letter: ' ', score: 0 })
    })
  })

  describe('applyTurn', () => {
    it('places tiles on board with scores from turn data', () => {
      const getState = setupGame()

      getState().applyTurn({
        type: 'move',
        player: 1,
        score: 10,
        timestamp: '2026-01-01T00:00:00Z',
        placements: [
          { letter: 'C', score: 3, x: 6, y: 7, blank: false },
          { letter: 'A', score: 1, x: 7, y: 7, blank: false },
          { letter: 'T', score: 1, x: 8, y: 7, blank: false },
        ],
      })

      const board = getState().board!
      expect(board[6][7].tile).toEqual({ letter: 'C', score: 3 })
      expect(board[7][7].tile).toEqual({ letter: 'A', score: 1 })
      expect(board[8][7].tile).toEqual({ letter: 'T', score: 1 })
      expect(board[6][7].tileLocked).toBe(true)
    })

    it('places blank tiles on board with score 0', () => {
      const getState = setupGame()

      getState().applyTurn({
        type: 'move',
        player: 1,
        score: 2,
        timestamp: '2026-01-01T00:00:00Z',
        placements: [
          { letter: 'A', score: 0, x: 7, y: 7, blank: true },
          { letter: 'T', score: 1, x: 8, y: 7, blank: false },
        ],
      })

      const board = getState().board!
      expect(board[7][7].tile).toEqual({ letter: 'A', score: 0 })
      expect(board[8][7].tile).toEqual({ letter: 'T', score: 1 })
    })

    it('removes tiles from board on challenge', () => {
      const getState = setupGame()

      // First apply a move
      getState().applyTurn({
        type: 'move',
        player: 1,
        score: 10,
        timestamp: '2026-01-01T00:00:00Z',
        placements: [
          { letter: 'C', score: 3, x: 7, y: 7, blank: false },
          { letter: 'A', score: 1, x: 8, y: 7, blank: false },
        ],
      })
      expect(getState().board![7][7].tile).not.toBeNull()

      // Challenge reverses the move
      getState().applyTurn({
        type: 'challenge',
        player: 1,
        score: -10,
        timestamp: '2026-01-01T00:00:01Z',
        placements: [
          { letter: '', score: 0, x: 7, y: 7, blank: false },
          { letter: '', score: 0, x: 8, y: 7, blank: false },
        ],
      })

      expect(getState().board![7][7].tile).toBeNull()
      expect(getState().board![8][7].tile).toBeNull()
    })

    it('clears pending placements on turn', () => {
      const getState = setupGame()
      const rack = getRackTiles(getState)

      getState().addPendingPlacement({
        letter: 'A',
        score: 1,
        x: 7,
        y: 7,
        blank: false,
        rackSlotId: rack[0].id,
      })
      expect(getState().pendingPlacements).toHaveLength(1)

      getState().applyTurn({
        type: 'move',
        player: 1,
        score: 5,
        timestamp: '2026-01-01T00:00:00Z',
        placements: [{ letter: 'X', score: 8, x: 0, y: 0, blank: false }],
      })

      expect(getState().pendingPlacements).toHaveLength(0)
    })

    it('skips duplicate turns by timestamp', () => {
      const getState = setupGame()

      const turn = {
        type: 'move',
        player: 1,
        score: 10,
        timestamp: '2026-01-01T00:00:00Z',
        placements: [{ letter: 'A', score: 1, x: 7, y: 7, blank: false }],
      }

      getState().applyTurn(turn)
      getState().applyTurn(turn) // duplicate

      expect(getState().turns).toHaveLength(1)
    })
  })
})
