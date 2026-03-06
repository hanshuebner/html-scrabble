import { useEffect, useCallback, useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
  type CollisionDetection,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useGameState } from './hooks/useGameState.js'
import { Board } from './components/Board.js'
import { Tile } from './components/Tile.js'
import { Rack } from './components/Rack.js'
import { Scoreboard } from './components/Scoreboard.js'
import { MoveLog } from './components/MoveLog.js'
import { ChatPanel } from './components/ChatPanel.js'
import { TurnControls } from './components/TurnControls.js'
import { BlankLetterPicker } from './components/BlankLetterPicker.js'
import { GameEndOverlay } from './components/GameEndOverlay.js'
import { api } from '../api/client.js'
import { getSocket, joinGame } from '../api/socket.js'
import { useNotifications } from './hooks/useNotifications.js'
import { useIsDesktop } from './hooks/useIsDesktop.js'
import { useTranslation } from 'react-i18next'

const SpectatorTurnStatus = () => {
  const { t } = useTranslation()
  const players = useGameState((s) => s.players)
  const whosTurn = useGameState((s) => s.whosTurn)
  const endMessage = useGameState((s) => s.endMessage)

  const currentPlayer = whosTurn !== null ? players[whosTurn]?.name : null

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 text-sm text-[#474633] text-center">
      {endMessage ? t('Game over') : currentPlayer ? t("{{name}}'s turn", { name: currentPlayer }) : t('Loading...')}
    </div>
  )
}

interface GamePageProps {
  gameKey: string
  playerKey?: string
}

export const GamePage = ({ gameKey, playerKey: playerKeyProp }: GamePageProps) => {
  const setGameData = useGameState((s) => s.setGameData)
  const applyTurn = useGameState((s) => s.applyTurn)
  const addChatMessage = useGameState((s) => s.addChatMessage)
  const playerJoined = useGameState((s) => s.playerJoined)
  const playerLeft = useGameState((s) => s.playerLeft)
  const updateMyRack = useGameState((s) => s.updateMyRack)
  const setEndMessage = useGameState((s) => s.setEndMessage)
  const setError = useGameState((s) => s.setError)
  const board = useGameState((s) => s.board)
  const clearSelection = useGameState((s) => s.clearSelection)
  const addPendingPlacement = useGameState((s) => s.addPendingPlacement)
  const getMyRackSlots = useGameState((s) => s.getMyRackSlots)
  const pendingPlacements = useGameState((s) => s.pendingPlacements)
  const playerKey = useGameState((s) => s.playerKey)
  const playerIndex = useGameState((s) => s.playerIndex)
  const isSpectator = playerIndex === null

  const [blankPicker, setBlankPicker] = useState<{
    rackSlotId: string
    x: number
    y: number
  } | null>(null)

  const [activeDragTile, setActiveDragTile] = useState<{ letter: string; score: number } | null>(null)
  const dragRackTileIdRef = useRef<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const [boardAreaHeight, setBoardAreaHeight] = useState<number | null>(null)
  const [boardTileSize, setBoardTileSize] = useState<number | null>(null)

  // Clear stale state immediately when game key changes (prevents old endMessage flashing)
  useEffect(() => {
    useGameState.setState({ endMessage: null, board: null, error: null })
  }, [gameKey])

  // Socket setup + load game data (join room before loading to avoid missing events)
  useEffect(() => {
    let cancelled = false
    const socket = getSocket()

    socket.on('turn', (turn) => applyTurn(turn))
    socket.on('rack', (rack) => updateMyRack(rack))
    socket.on('gameEnded', (msg) => setEndMessage(msg))
    socket.on('message', (msg) => addChatMessage(msg))
    socket.on('join', (pi: number) => playerJoined(pi))
    socket.on('leave', (pi: number) => playerLeft(pi))
    socket.on('nextGame', (nextGameKey: string) => {
      const state = useGameState.getState()
      if (state.endMessage) {
        setEndMessage({ ...state.endMessage, nextGameKey })
      }
    })

    // Connection status tracking
    const onDisconnect = () => setConnectionStatus('disconnected')
    const onReconnecting = () => setConnectionStatus('reconnecting')
    const onConnect = () => {
      // Re-join room and re-fetch game state before removing overlay
      joinGame(gameKey, playerKeyProp || playerKey || undefined).then(() => {
        if (cancelled) return
        api
          .getGame(gameKey, playerKeyProp)
          .then((data) => {
            if (!cancelled) {
              setGameData(data, playerKeyProp)
              setConnectionStatus('connected')
            }
          })
          .catch(() => {})
      })
    }
    socket.on('disconnect', onDisconnect)
    socket.io.on('reconnect_attempt', onReconnecting)
    socket.on('connect', onConnect)

    // Join socket room first, then load game data so we never miss events
    joinGame(gameKey, playerKeyProp || playerKey || undefined).then(() => {
      if (cancelled) return
      api
        .getGame(gameKey, playerKeyProp)
        .then((data) => {
          if (!cancelled) setGameData(data, playerKeyProp)
        })
        .catch((e) => {
          if (!cancelled) setError(e.message)
        })
    })

    return () => {
      cancelled = true
      socket.off('turn')
      socket.off('rack')
      socket.off('gameEnded')
      socket.off('message')
      socket.off('join')
      socket.off('leave')
      socket.off('nextGame')
      socket.off('disconnect', onDisconnect)
      socket.io.off('reconnect_attempt', onReconnecting)
      socket.off('connect', onConnect)
    }
  }, [
    gameKey,
    playerKeyProp,
    playerKey,
    applyTurn,
    updateMyRack,
    setEndMessage,
    addChatMessage,
    playerJoined,
    playerLeft,
    setGameData,
    setError,
  ])

  const [mobileTab, setMobileTab] = useState<'score' | 'log' | 'chat'>('score')
  const isDesktop = useIsDesktop()

  useNotifications()

  // Measure board+rack area height to constrain sidebar, and board tile size
  useEffect(() => {
    const el = boardAreaRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setBoardAreaHeight(entries[0].contentRect.height)
      // The board grid is the first child; measure tile size from it
      const boardGrid = el.querySelector('.grid')
      if (boardGrid) {
        // Board has 2px padding on each side, grid fills the rest
        const gridWidth = boardGrid.clientWidth - 4 // subtract p-[2px] * 2
        setBoardTileSize(gridWidth / 15)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [board])

  // Place tile from rack to board via click-to-select
  const handleBoardClickForPlacement = useCallback(
    (x: number, y: number) => {
      const state = useGameState.getState()
      if (!state.isMyTurn()) return
      if (!state.selectedSquare?.fromRack) return

      const rackIndex = state.selectedSquare.x
      const slots = state.getMyRackSlots()
      const slot = slots[rackIndex]
      if (!slot?.tile) return

      // Check board square is empty
      if (state.board?.[x]?.[y]?.tile) return
      if (state.pendingPlacements.find((p) => p.x === x && p.y === y)) return

      if (slot.tile.score === 0) {
        // Blank tile - show picker
        setBlankPicker({ rackSlotId: slot.id, x, y })
      } else {
        addPendingPlacement({
          letter: slot.tile.letter,
          score: slot.tile.score,
          x,
          y,
          blank: false,
          rackSlotId: slot.id,
        })
      }
      clearSelection()
    },
    [addPendingPlacement, clearSelection],
  )

  const handleBlankSelect = (letter: string) => {
    if (!blankPicker) return
    addPendingPlacement({
      letter,
      score: 0,
      x: blankPicker.x,
      y: blankPicker.y,
      blank: true,
      rackSlotId: blankPicker.rackSlotId,
    })
    setBlankPicker(null)
  }

  const reorderRack = useGameState((s) => s.reorderRack)
  const shuffleRack = useGameState((s) => s.shuffleRack)
  const clearPendingPlacements = useGameState((s) => s.clearPendingPlacements)

  const removePendingPlacement = useGameState((s) => s.removePendingPlacement)

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id)
    if (activeId.startsWith('pending-')) {
      const [, px, py] = activeId.split('-').map(Number)
      const state = useGameState.getState()
      const pending = state.pendingPlacements.find((p) => p.x === px && p.y === py)
      if (pending) {
        setActiveDragTile({ letter: pending.letter, score: pending.score })
      }
    } else {
      // Stable tile ID from rack
      dragRackTileIdRef.current = activeId
      const slots = useGameState.getState().getMyRackSlots()
      const slot = slots.find((s) => s.id === activeId)
      if (slot?.tile) {
        setActiveDragTile({ letter: slot.tile.letter, score: slot.tile.score })
      }
    }
  }, [])

  const handleDragOver = useCallback(
    (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
      if (!dragRackTileIdRef.current) return
      const overId = event.over ? String(event.over.id) : null
      if (!overId || overId.startsWith('pending-') || overId.startsWith('board-')) return
      // overId is a stable tile ID — find both indices
      const slots = useGameState.getState().getMyRackSlots()
      const fromIndex = slots.findIndex((s) => s.id === dragRackTileIdRef.current)
      const overIndex = slots.findIndex((s) => s.id === overId)
      if (fromIndex !== -1 && overIndex !== -1 && fromIndex !== overIndex) {
        reorderRack(fromIndex, overIndex)
      }
    },
    [reorderRack],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragTile(null)
      const dragTileId = dragRackTileIdRef.current
      dragRackTileIdRef.current = null
      const { over } = event
      if (!over) return

      const overId = String(over.id)

      // Rack tile dragged to a board square (only when it's my turn)
      if (dragTileId && overId.startsWith('board-')) {
        if (!useGameState.getState().isMyTurn()) return
        const state = useGameState.getState()
        const slot = state.getMyRackSlots().find((s) => s.id === dragTileId)
        if (!slot?.tile) return
        const [, bx, by] = overId.split('-').map(Number)
        if (state.board?.[bx]?.[by]?.tile) return
        if (state.pendingPlacements.find((p) => p.x === bx && p.y === by)) return

        if (slot.tile.score === 0) {
          setBlankPicker({ rackSlotId: dragTileId, x: bx, y: by })
        } else {
          addPendingPlacement({
            letter: slot.tile.letter,
            score: slot.tile.score,
            x: bx,
            y: by,
            blank: false,
            rackSlotId: dragTileId,
          })
        }
      }

      // Pending board tile dragged to another board square (only when it's my turn)
      if (!dragTileId && overId.startsWith('board-')) {
        if (!useGameState.getState().isMyTurn()) return
        const activeId = String(event.active.id)
        const [, px, py] = activeId.split('-').map(Number)
        const [, bx, by] = overId.split('-').map(Number)
        const state = useGameState.getState()
        if (state.board?.[bx]?.[by]?.tile) return
        if (state.pendingPlacements.find((p) => p.x === bx && p.y === by)) return
        const pending = state.pendingPlacements.find((p) => p.x === px && p.y === py)
        if (!pending) return
        removePendingPlacement(px, py)
        addPendingPlacement({ ...pending, x: bx, y: by })
      }

      // Pending board tile dragged back to rack — overId is a stable tile ID
      if (!dragTileId && !overId.startsWith('board-') && !overId.startsWith('pending-')) {
        const activeId = String(event.active.id)
        if (!activeId.startsWith('pending-')) return
        const [, px, py] = activeId.split('-').map(Number)
        const restoredSlotId = removePendingPlacement(px, py)
        if (!restoredSlotId) return
        const state = useGameState.getState()
        const slots = state.getMyRackSlots()
        const originalRackIndex = slots.findIndex((s) => s.id === restoredSlotId)
        const targetRackIndex = slots.findIndex((s) => s.id === overId)
        if (targetRackIndex !== -1 && originalRackIndex !== -1 && originalRackIndex !== targetRackIndex) {
          reorderRack(originalRackIndex, targetRackIndex)
        }
      }

      // Rack-to-rack reorder is handled live in onDragOver
    },
    [addPendingPlacement, removePendingPlacement, reorderRack],
  )

  // Keyboard handler (desktop only)
  useEffect(() => {
    if (!isDesktop) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameState.getState()
      if (!state.cursor || !state.board || !state.isMyTurn()) return

      const { cursor, legalLetters } = state
      const letter = e.key.toUpperCase()

      if (legalLetters.includes(letter)) {
        // Find this letter in the rack
        const slots = state.getMyRackSlots()
        let slot = slots.find((s) => s.tile && s.tile.letter === letter)

        // If no matching letter tile, use a blank tile instead
        let useBlank = false
        if (!slot) {
          slot = slots.find((s) => s.tile && s.tile.score === 0)
          if (slot) useBlank = true
        }

        if (slot?.tile) {
          const sq = state.board[cursor.x]?.[cursor.y]
          if (sq && !sq.tile && !state.pendingPlacements.find((p) => p.x === cursor.x && p.y === cursor.y)) {
            addPendingPlacement({
              letter,
              score: useBlank ? 0 : slot.tile.score,
              x: cursor.x,
              y: cursor.y,
              blank: useBlank,
              rackSlotId: slot.id,
            })

            // Advance cursor to next free square in cursor direction
            const updatedState = useGameState.getState()
            let nx = cursor.x
            let ny = cursor.y
            do {
              nx += cursor.horizontal ? 1 : 0
              ny += cursor.horizontal ? 0 : 1
            } while (
              nx < 15 &&
              ny < 15 &&
              (updatedState.board![nx][ny].tile || updatedState.pendingPlacements.find((p) => p.x === nx && p.y === ny))
            )
            if (nx < 15 && ny < 15) {
              updatedState.setCursor({ x: nx, y: ny, horizontal: cursor.horizontal })
            }
          }
        }
      } else if (e.key === ' ') {
        e.preventDefault()
        useGameState.getState().setCursor({
          ...cursor,
          horizontal: !cursor.horizontal,
        })
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        // Remove last placed tile at or before cursor
        const pp = state.pendingPlacements
        if (pp.length > 0) {
          const last = pp[pp.length - 1]
          useGameState.getState().removePendingPlacement(last.x, last.y)
          useGameState.getState().setCursor({ x: last.x, y: last.y, horizontal: cursor.horizontal })
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        let nx = cursor.x
        do {
          nx++
        } while (
          nx < 15 &&
          (state.board![nx]?.[cursor.y]?.tile || state.pendingPlacements.find((p) => p.x === nx && p.y === cursor.y))
        )
        if (nx < 15) useGameState.getState().setCursor({ ...cursor, x: nx })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        let nx = cursor.x
        do {
          nx--
        } while (
          nx >= 0 &&
          (state.board![nx]?.[cursor.y]?.tile || state.pendingPlacements.find((p) => p.x === nx && p.y === cursor.y))
        )
        if (nx >= 0) useGameState.getState().setCursor({ ...cursor, x: nx })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        let ny = cursor.y
        do {
          ny++
        } while (
          ny < 15 &&
          (state.board![cursor.x]?.[ny]?.tile || state.pendingPlacements.find((p) => p.x === cursor.x && p.y === ny))
        )
        if (ny < 15) useGameState.getState().setCursor({ ...cursor, y: ny })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        let ny = cursor.y
        do {
          ny--
        } while (
          ny >= 0 &&
          (state.board![cursor.x]?.[ny]?.tile || state.pendingPlacements.find((p) => p.x === cursor.x && p.y === ny))
        )
        if (ny >= 0) useGameState.getState().setCursor({ ...cursor, y: ny })
      } else if (e.key === 'Escape') {
        useGameState.getState().setCursor(null)
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDesktop, addPendingPlacement, clearSelection])

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  const MOBILE_Y_OFFSET = -60

  const mobileLiftModifier: Modifier = useCallback(
    ({ transform, activatorEvent, activeNodeRect }) => {
      if (isDesktop) return transform
      // Zero out X offset: snap overlay center horizontally to pointer
      let xCorrection = 0
      if (activatorEvent && activeNodeRect) {
        const event = activatorEvent as TouchEvent | PointerEvent
        const pointerX = 'touches' in event ? event.touches[0].clientX : event.clientX
        const nodeCenterX = activeNodeRect.left + activeNodeRect.width / 2
        xCorrection = pointerX - nodeCenterX
      }
      return { ...transform, x: transform.x + xCorrection, y: transform.y + MOBILE_Y_OFFSET }
    },
    [isDesktop],
  )

  const offsetPointerWithin: CollisionDetection = useCallback(
    (args) => {
      if (isDesktop || !args.pointerCoordinates) return pointerWithin(args)
      return pointerWithin({
        ...args,
        pointerCoordinates: {
          x: args.pointerCoordinates.x,
          y: args.pointerCoordinates.y + MOBILE_Y_OFFSET,
        },
      })
    },
    [isDesktop],
  )

  // Rack tile IDs for sortable (only include tiles actually present)
  const rackSlots = getMyRackSlots()
  const rackIds = rackSlots.filter((s) => s.tile !== null).map((s) => s.id)

  const { t } = useTranslation()

  if (!board) {
    return <div className="min-h-screen bg-woodgrain" />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={offsetPointerWithin}
      modifiers={[mobileLiftModifier]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen desktop:h-dvh bg-woodgrain flex flex-col desktop:justify-center">
        {connectionStatus !== 'connected' && (
          <div className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-woodgrain text-white text-xl px-8 py-6 rounded-xl shadow-lg">
              {t('Server not available')}
            </div>
          </div>
        )}
        {/* Desktop layout */}
        <div className="max-w-[74rem] mx-auto p-2 desktop:p-1 flex flex-col desktop:flex-row gap-4 flex-1 desktop:flex-initial desktop:max-h-[calc(100dvh-0.5rem)] w-full">
          {/* Controls sidebar - hidden on mobile, shown on desktop */}
          <div
            className="hidden desktop:flex desktop:flex-col desktop:w-[20rem] order-1 overflow-hidden desktop:self-start"
            style={boardAreaHeight ? { height: `${boardAreaHeight}px` } : undefined}
          >
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              <div className="shrink-0">
                <Scoreboard />
              </div>
              <div className="flex-1 shrink min-h-0 overflow-hidden [@media(max-height:470px)]:hidden">
                <MoveLog />
              </div>
              {!isSpectator && (
                <div className="flex-[0.85] shrink-[2] min-h-0 overflow-hidden [@media(max-height:630px)]:hidden">
                  <ChatPanel />
                </div>
              )}
            </div>
            <div className="shrink-0 mt-auto pt-3">{isSpectator ? <SpectatorTurnStatus /> : <TurnControls />}</div>
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center desktop:items-start gap-3 order-1 desktop:order-2">
            <div
              ref={boardAreaRef}
              className="flex flex-col items-center gap-2"
              style={boardTileSize ? ({ '--tile-size': `${boardTileSize}px` } as React.CSSProperties) : undefined}
              onClick={(e) => {
                const target = e.target as HTMLElement
                const boardSquare = target.closest('[data-board-square]')
                if (boardSquare) {
                  const x = Number(boardSquare.getAttribute('data-x'))
                  const y = Number(boardSquare.getAttribute('data-y'))
                  handleBoardClickForPlacement(x, y)
                }
              }}
            >
              <Board />
              {/* Rack with Recall/Shuffle buttons inside the frame */}
              {!isSpectator && (
                <div className="@container w-[calc(100vw-1rem)] max-w-[min(43.75rem,100%)] desktop:w-[min(43.75rem,calc((100dvh-3rem)*15/16))] bg-[#54534A] rounded shadow-md p-[2px]">
                  <div className="flex items-center px-1">
                    <button
                      onClick={() => {
                        clearPendingPlacements()
                        useGameState.getState().setCursor(null)
                      }}
                      className={`px-2 py-1 text-sm text-[#AAA38E] hover:text-white shrink-0 ${pendingPlacements.length === 0 ? 'invisible' : ''}`}
                      title={t('Recall')}
                    >
                      {t('Recall')}
                    </button>
                    <div className="flex-1 flex justify-center min-w-0">
                      <SortableContext items={rackIds} strategy={horizontalListSortingStrategy}>
                        <Rack />
                      </SortableContext>
                    </div>
                    <button
                      onClick={shuffleRack}
                      className="px-2 py-1 text-sm text-[#AAA38E] hover:text-white shrink-0"
                      title="Shuffle"
                    >
                      {t('Shuffle')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile controls - tab interface */}
            <div className="desktop:hidden w-full space-y-2">
              {isSpectator ? <SpectatorTurnStatus /> : <TurnControls />}
              <div className="flex border-b border-[#DCDCC6] bg-[#F7F7E3] rounded-t-md">
                {(isSpectator ? (['score', 'log'] as const) : (['score', 'log', 'chat'] as const)).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMobileTab(tab as typeof mobileTab)}
                    className={`flex-1 py-2 text-sm font-medium capitalize ${
                      mobileTab === tab ? 'text-[#474633] border-b-2 border-[#474633]' : 'text-[#AAA38E]'
                    }`}
                  >
                    {tab === 'score' ? t('Score') : tab === 'log' ? t('Moves') : t('Chat')}
                  </button>
                ))}
              </div>
              <div>
                {mobileTab === 'score' && <Scoreboard />}
                {mobileTab === 'log' && <MoveLog />}
                {mobileTab === 'chat' && !isSpectator && <ChatPanel />}
              </div>
            </div>
          </div>
        </div>

        {/* spacer (mobile only) */}
        <div className="pb-4 desktop:pb-0" />
      </div>

      {blankPicker && <BlankLetterPicker onSelect={handleBlankSelect} onCancel={() => setBlankPicker(null)} />}
      <GameEndOverlay />
      <DragOverlay dropAnimation={null}>
        {activeDragTile && boardTileSize && (
          <div className="@container" style={{ width: boardTileSize * 15 }}>
            <div style={{ width: boardTileSize, height: boardTileSize }}>
              <Tile letter={activeDragTile.letter} score={activeDragTile.score} isBlank={activeDragTile.score === 0} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
