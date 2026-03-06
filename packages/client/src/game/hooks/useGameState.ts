import { create } from 'zustand'

export interface TileData {
  letter: string
  score: number
}

export interface RackSlot {
  tile: TileData | null
  id: string
}

export interface SquareData {
  type: string
  x: number
  y: number
  tile: TileData | null
  tileLocked: boolean
}

export interface PlayerData {
  name: string
  score: number
  rack: RackSlot[] | null
}

let rackIdCounter = 0
const assignRackIds = (rack: { tile: TileData | null }[]): RackSlot[] =>
  rack.map((slot) => ({ ...slot, id: `t${++rackIdCounter}` }))

export interface TurnData {
  type: string
  player?: number
  playerIndex?: number
  score: number
  move?: { words: { word: string; score: number }[] }
  moveData?: { words?: { word: string; score: number }[] }
  placements?: { letter: string; x: number; y: number; blank: boolean }[]
  count?: number
  timestamp?: string
  whosTurn?: number
  remainingTileCounts?: { letterBag: number; players: number[] }
}

export interface ChatMessage {
  playerName: string
  message: string
}

interface CursorState {
  x: number
  y: number
  horizontal: boolean
}

interface GameState {
  // Game data
  gameKey: string | null
  playerKey: string | null
  playerIndex: number | null
  language: string
  board: SquareData[][] | null
  players: PlayerData[]
  turns: TurnData[]
  whosTurn: number | null
  legalLetters: string
  remainingTileCounts: { letterBag: number; players: number[] } | null
  endMessage: any | null

  // UI state
  selectedSquare: { x: number; y: number; fromRack: boolean } | null
  cursor: CursorState | null
  pendingPlacements: { letter: string; score: number; x: number; y: number; blank: boolean; rackSlotId: string }[]
  chatMessages: ChatMessage[]
  onlinePlayers: Set<number>
  swapMode: boolean
  swapIndices: Set<number>
  error: string | null
  loading: boolean

  // Actions
  setGameData: (data: any, playerKey?: string) => void
  applyTurn: (turn: TurnData) => void
  selectSquare: (x: number, y: number, fromRack: boolean) => void
  clearSelection: () => void
  setCursor: (cursor: CursorState | null) => void
  addPendingPlacement: (placement: {
    letter: string
    score: number
    x: number
    y: number
    blank: boolean
    rackSlotId: string
  }) => void
  removePendingPlacement: (x: number, y: number) => string
  clearPendingPlacements: () => void
  updateMyRack: (rack: { tile: TileData | null; id?: string }[]) => void
  reorderRack: (fromIndex: number, toIndex: number) => void
  shuffleRack: () => void
  addChatMessage: (msg: ChatMessage) => void
  playerJoined: (playerIndex: number) => void
  playerLeft: (playerIndex: number) => void
  setSwapMode: (on: boolean) => void
  toggleSwapTile: (index: number) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setEndMessage: (msg: any) => void

  // Helpers
  isMyTurn: () => boolean
  getMyRack: () => (TileData | null)[]
  getMyRackSlots: () => RackSlot[]
}

export const useGameState = create<GameState>((set, get) => ({
  gameKey: null,
  playerKey: null,
  playerIndex: null,
  language: 'English',
  board: null,
  players: [],
  turns: [],
  whosTurn: null,
  legalLetters: '',
  remainingTileCounts: null,
  endMessage: null,

  selectedSquare: null,
  cursor: null,
  pendingPlacements: [],
  chatMessages: [],
  onlinePlayers: new Set<number>(),
  swapMode: false,
  swapIndices: new Set<number>(),
  error: null,
  loading: false,

  setGameData: (data, playerKey) => {
    const playerIndex = playerKey ? data.players.findIndex((_: any, i: number) => data.players[i].rack !== null) : null

    const players = data.players.map((p: any) => ({
      ...p,
      rack: p.rack ? assignRackIds(p.rack) : null,
    }))

    set({
      gameKey: data.key,
      playerKey: playerKey || null,
      playerIndex,
      language: data.language,
      board: data.board,
      players,
      turns: data.turns || [],
      whosTurn: data.whosTurn ?? null,
      legalLetters: data.legalLetters || '',
      remainingTileCounts: data.remainingTileCounts || null,
      endMessage: data.endMessage || null,
      pendingPlacements: [],
      error: null,
    })
  },

  applyTurn: (turn) => {
    set((state) => {
      // Skip duplicate turns (e.g. socket reconnection)
      if (state.turns.some((t) => t.timestamp === turn.timestamp)) return {}
      // Apply tile placements to the board
      let board = state.board
      if (board && turn.placements && turn.type === 'move') {
        board = board.map((col) => col.map((sq) => ({ ...sq })))
        for (const p of turn.placements) {
          board[p.x][p.y] = {
            ...board[p.x][p.y],
            tile: { letter: p.letter, score: p.blank ? 0 : (board[p.x][p.y].tile?.score ?? 1) },
            tileLocked: true,
          }
        }
      }
      // Reverse placements on challenge/takeBack
      if (board && turn.placements && (turn.type === 'challenge' || turn.type === 'takeBack')) {
        board = board.map((col) => col.map((sq) => ({ ...sq })))
        for (const p of turn.placements) {
          board[p.x][p.y] = { ...board[p.x][p.y], tile: null, tileLocked: false }
        }
      }

      // Update player scores
      const turnPlayerIndex = turn.player ?? turn.playerIndex ?? 0
      const players = state.players.map((p, i) => {
        if (i === turnPlayerIndex) {
          return { ...p, score: p.score + (turn.score || 0) }
        }
        return p
      })

      return {
        board,
        players,
        turns: [...state.turns, turn],
        whosTurn: turn.whosTurn ?? state.whosTurn,
        remainingTileCounts: turn.remainingTileCounts || state.remainingTileCounts,
        pendingPlacements: [],
      }
    })
  },

  selectSquare: (x, y, fromRack) => set({ selectedSquare: { x, y, fromRack } }),
  clearSelection: () => set({ selectedSquare: null }),
  setCursor: (cursor) => set({ cursor }),

  addPendingPlacement: (placement) =>
    set((state) => {
      const updates: Partial<GameState> = {
        pendingPlacements: [...state.pendingPlacements, placement],
      }
      // Null out the tile in the rack slot
      if (state.playerIndex !== null) {
        const player = state.players[state.playerIndex]
        if (player?.rack) {
          const newRack = player.rack.map((s) =>
            s.id === placement.rackSlotId ? { ...s, tile: null } : s,
          )
          const newPlayers = [...state.players]
          newPlayers[state.playerIndex] = { ...player, rack: newRack }
          updates.players = newPlayers
        }
      }
      return updates
    }),

  removePendingPlacement: (x, y) => {
    const state = get()
    const idx = state.pendingPlacements.findIndex((p) => p.x === x && p.y === y)
    if (idx !== -1) {
      const placement = state.pendingPlacements[idx]
      const updates: Partial<GameState> = {
        pendingPlacements: state.pendingPlacements.filter((_, i) => i !== idx),
      }
      // Restore tile back into its rack slot
      if (state.playerIndex !== null) {
        const player = state.players[state.playerIndex]
        if (player?.rack) {
          const restoredTile = placement.blank
            ? { letter: ' ', score: 0 }
            : { letter: placement.letter, score: placement.score }
          const newRack = player.rack.map((s) =>
            s.id === placement.rackSlotId ? { ...s, tile: restoredTile } : s,
          )
          const newPlayers = [...state.players]
          newPlayers[state.playerIndex] = { ...player, rack: newRack }
          updates.players = newPlayers
        }
      }
      set(updates)
      return placement.rackSlotId
    }
    return ''
  },

  clearPendingPlacements: () => {
    const state = get()
    if (state.pendingPlacements.length === 0) {
      set({ pendingPlacements: [] })
      return
    }
    if (state.playerIndex !== null) {
      const player = state.players[state.playerIndex]
      if (player?.rack) {
        const placementsBySlotId = new Map(state.pendingPlacements.map((p) => [p.rackSlotId, p]))
        const newRack = player.rack.map((s) => {
          const p = placementsBySlotId.get(s.id)
          if (!p) return s
          const restoredTile = p.blank ? { letter: ' ', score: 0 } : { letter: p.letter, score: p.score }
          return { ...s, tile: restoredTile }
        })
        const newPlayers = [...state.players]
        newPlayers[state.playerIndex] = { ...player, rack: newRack }
        set({ pendingPlacements: [], players: newPlayers })
        return
      }
    }
    set({ pendingPlacements: [] })
  },
  updateMyRack: (rack) => {
    set((state) => {
      if (state.playerIndex === null) return {}
      const newPlayers = [...state.players]
      newPlayers[state.playerIndex] = { ...newPlayers[state.playerIndex], rack: assignRackIds(rack) }
      return { players: newPlayers, pendingPlacements: [], swapMode: false, swapIndices: new Set() }
    })
  },
  reorderRack: (fromIndex, toIndex) => {
    const state = get()
    if (state.playerIndex === null) return
    const player = state.players[state.playerIndex]
    if (!player?.rack) return
    const newRack = [...player.rack]
    if (!newRack[toIndex]?.tile) {
      // Target is empty — swap
      ;[newRack[fromIndex], newRack[toIndex]] = [newRack[toIndex], newRack[fromIndex]]
    } else {
      // Both filled — splice reorder
      const [moved] = newRack.splice(fromIndex, 1)
      newRack.splice(toIndex, 0, moved)
    }
    const newPlayers = [...state.players]
    newPlayers[state.playerIndex] = { ...player, rack: newRack }
    set({ players: newPlayers })
  },
  shuffleRack: () => {
    const state = get()
    if (state.playerIndex === null) return
    const player = state.players[state.playerIndex]
    if (!player?.rack) return
    const newRack = [...player.rack]
    // Only shuffle slots that have tiles (leave empty slots in place)
    const filledIndices = newRack.map((s, i) => (s.tile ? i : -1)).filter((i) => i !== -1)
    for (let i = filledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const a = filledIndices[i]
      const b = filledIndices[j]
      ;[newRack[a], newRack[b]] = [newRack[b], newRack[a]]
    }
    const newPlayers = [...state.players]
    newPlayers[state.playerIndex] = { ...player, rack: newRack }
    set({ players: newPlayers })
  },
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  playerJoined: (playerIndex) =>
    set((state) => {
      const next = new Set(state.onlinePlayers)
      next.add(playerIndex)
      return { onlinePlayers: next }
    }),
  playerLeft: (playerIndex) =>
    set((state) => {
      const next = new Set(state.onlinePlayers)
      next.delete(playerIndex)
      return { onlinePlayers: next }
    }),
  setSwapMode: (on) => set({ swapMode: on, swapIndices: new Set() }),
  toggleSwapTile: (index) =>
    set((state) => {
      const next = new Set(state.swapIndices)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return { swapIndices: next }
    }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),
  setEndMessage: (endMessage) => set({ endMessage }),

  isMyTurn: () => {
    const state = get()
    return state.playerIndex !== null && state.whosTurn === state.playerIndex
  },

  getMyRack: () => {
    const state = get()
    if (state.playerIndex === null) return []
    const rackData = state.players[state.playerIndex]?.rack
    if (!rackData) return []
    return rackData.map((sq) => sq.tile)
  },

  getMyRackSlots: () => {
    const state = get()
    if (state.playerIndex === null) return []
    return state.players[state.playerIndex]?.rack ?? []
  },
}))
