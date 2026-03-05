import { useEffect, useMemo, useRef } from 'react'
import { useGameState } from '../hooks/useGameState.js'
import { api } from '../../api/client.js'
import { calculateMove, Tile, Square } from '@scrabble/shared'
import type { MoveResult } from '@scrabble/shared'

export const TurnControls = () => {
  const gameKey = useGameState((s) => s.gameKey)
  const whosTurn = useGameState((s) => s.whosTurn)
  const playerIndex = useGameState((s) => s.playerIndex)
  const players = useGameState((s) => s.players)
  const isMyTurn = playerIndex !== null && whosTurn === playerIndex
  const pendingPlacements = useGameState((s) => s.pendingPlacements)
  const setError = useGameState((s) => s.setError)
  const setLoading = useGameState((s) => s.setLoading)
  const loading = useGameState((s) => s.loading)
  const endMessage = useGameState((s) => s.endMessage)
  const error = useGameState((s) => s.error)
  const remainingTileCounts = useGameState((s) => s.remainingTileCounts)
  const board = useGameState((s) => s.board)
  const turns = useGameState((s) => s.turns)
  const playerKey = useGameState((s) => s.playerKey)
  const getMyRack = useGameState((s) => s.getMyRack)
  const swapMode = useGameState((s) => s.swapMode)
  const swapIndices = useGameState((s) => s.swapIndices)
  const setSwapMode = useGameState((s) => s.setSwapMode)
  const toggleSwapTile = useGameState((s) => s.toggleSwapTile)
  const swapContainerRef = useRef<HTMLDivElement>(null)

  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null
  const hasPreviousMove = lastTurn?.type === 'move'
  const lastMovePlayerIndex = lastTurn?.player ?? lastTurn?.playerIndex
  const canSwap = (remainingTileCounts?.letterBag ?? 0) >= 7

  // Use shared move calculator for validation and score preview
  const moveResult: MoveResult | null = useMemo(() => {
    if (!board || pendingPlacements.length === 0) return null

    // Build Square[][] with pending placements merged in
    const squares: Square[][] = []
    for (let x = 0; x < 15; x++) {
      squares[x] = []
      for (let y = 0; y < 15; y++) {
        const sq = new Square(board[x][y].type as any)
        sq.x = x
        sq.y = y
        if (board[x][y].tile) {
          sq.tile = new Tile(board[x][y].tile!.letter, board[x][y].tile!.score)
          sq.tileLocked = board[x][y].tileLocked
        }
        squares[x][y] = sq
      }
    }

    // Place pending tiles as unlocked
    for (const p of pendingPlacements) {
      squares[p.x][p.y].tile = new Tile(p.letter, p.score)
      squares[p.x][p.y].tileLocked = false
    }

    return calculateMove(squares)
  }, [board, pendingPlacements])

  const isValidPlacement = moveResult !== null && !moveResult.error

  // Keyboard handler for swap mode: type letters to toggle tiles
  useEffect(() => {
    if (!swapMode) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key
      if (key === 'Escape') {
        setSwapMode(false)
        return
      }
      if (key === 'Enter' && swapIndices.size > 0) {
        e.preventDefault()
        swapContainerRef.current?.querySelector<HTMLButtonElement>('[data-swap-confirm]')?.click()
        return
      }
      const letter = key.toUpperCase()
      if (!/^[A-Z]$/.test(letter)) return
      const rack = getMyRack()
      // Find a rack tile with this letter that isn't already selected for swap
      const idx = rack.findIndex((t, i) => t && t.letter === letter && !swapIndices.has(i))
      if (idx !== -1) {
        toggleSwapTile(idx)
      } else {
        // If all instances selected, deselect one
        const selectedIdx = [...swapIndices].find((i) => rack[i]?.letter === letter)
        if (selectedIdx !== undefined) {
          toggleSwapTile(selectedIdx)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [swapMode, swapIndices, getMyRack, setSwapMode, toggleSwapTile])

  const setCursor = useGameState((s) => s.setCursor)

  if (!gameKey) return null
  if (endMessage) return null

  const handleSwapConfirm = async () => {
    const rack = getMyRack()
    const letters = [...swapIndices].map((i) => rack[i]!.letter)
    if (letters.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await api.swap(gameKey, letters, playerKey!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitMove = async () => {
    if (!pendingPlacements.length) return
    setLoading(true)
    setError(null)
    try {
      await api.makeMove(
        gameKey,
        [...pendingPlacements].map((p) => ({
          letter: p.letter,
          x: p.x,
          y: p.y,
          blank: p.blank,
        })),
        playerKey!,
      )
      setCursor(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePass = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.pass(gameKey, playerKey!)
      setCursor(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChallenge = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.challenge(gameKey, playerKey!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTakeBack = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.takeBack(gameKey, playerKey!)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Swap mode UI — rack handles tile selection, we just show swap tray + buttons
  if (swapMode) {
    const rack = getMyRack()

    return (
      <div ref={swapContainerRef} className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 space-y-2">
        {error && <div className="text-red-600 text-xs p-2 bg-red-50 rounded">{error}</div>}
        <div className="text-sm text-[#474633] text-center">Select tiles in your rack to swap (or type letters)</div>

        {/* Swap tray showing selected tiles */}
        {swapIndices.size > 0 && (
          <div className="flex items-center gap-2 justify-center">
            <span className="text-xs text-[#AAA38E]">Swapping:</span>
            <div className="flex gap-1 p-1 bg-[#54534A] rounded">
              {[...swapIndices].map((i) => {
                const tile = rack[i]!
                return (
                  <button
                    key={i}
                    onClick={() => toggleSwapTile(i)}
                    className="w-8 h-8 bg-[#F7F7E3] border border-[#DCDCC6] rounded-sm flex items-center justify-center text-sm font-medium text-[#474633] hover:ring-2 hover:ring-orange-400 relative"
                  >
                    {tile.letter}
                    {tile.score > 0 && <span className="absolute text-[8px] bottom-0 right-0.5">{tile.score}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Confirm / Cancel */}
        <div className="flex gap-2 justify-center">
          <button
            data-swap-confirm
            onClick={handleSwapConfirm}
            disabled={loading || swapIndices.size === 0}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Swap {swapIndices.size > 0 ? `${swapIndices.size} tile${swapIndices.size > 1 ? 's' : ''}` : ''}
          </button>
          <button
            onClick={() => setSwapMode(false)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 space-y-2">
      {error && <div className="text-red-600 text-xs p-2 bg-red-50 rounded">{error}</div>}

      {moveResult && !moveResult.error && moveResult.words && moveResult.words.length > 0 && (
        <div className="text-sm text-[#474633] text-center">
          {moveResult.words.map((w) => w.word).join(', ')} — {moveResult.score} pts
          {moveResult.allTilesBonus ? ' (incl. 50 bonus)' : ''}
        </div>
      )}

      {moveResult?.error && pendingPlacements.length > 0 && (
        <div className="text-xs text-[#AAA38E] text-center">{moveResult.error}</div>
      )}

      {!isMyTurn && (
        <div className="text-sm text-[#AAA38E] text-center">
          Waiting for {whosTurn !== null ? players[whosTurn]?.name : 'opponent'} to make their move...
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {isValidPlacement && (
          <button
            onClick={handleSubmitMove}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Submit Move
          </button>
        )}

        {isMyTurn && pendingPlacements.length === 0 && (
          <>
            <button
              onClick={handlePass}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Pass
            </button>
            {canSwap && (
              <button
                onClick={() => setSwapMode(true)}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Swap
              </button>
            )}
          </>
        )}

        {hasPreviousMove && isMyTurn && pendingPlacements.length === 0 && (
          <button
            onClick={handleChallenge}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Challenge
          </button>
        )}
        {hasPreviousMove && playerIndex === lastMovePlayerIndex && pendingPlacements.length === 0 && (
          <button
            onClick={handleTakeBack}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Take Back
          </button>
        )}
      </div>
    </div>
  )
}
