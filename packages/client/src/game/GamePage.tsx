import { useEffect, useCallback, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useGameState } from './hooks/useGameState.js';
import { Board } from './components/Board.js';
import { Tile } from './components/Tile.js';
import { Rack } from './components/Rack.js';
import { Scoreboard } from './components/Scoreboard.js';
import { MoveLog } from './components/MoveLog.js';
import { ChatPanel } from './components/ChatPanel.js';
import { TurnControls } from './components/TurnControls.js';
import { BlankLetterPicker } from './components/BlankLetterPicker.js';
import { GameEndOverlay } from './components/GameEndOverlay.js';
import { api } from '../api/client.js';
import { getSocket, joinGame } from '../api/socket.js';
import { useNotifications } from './hooks/useNotifications.js';

function SpectatorTurnStatus() {
  const players = useGameState((s) => s.players);
  const whosTurn = useGameState((s) => s.whosTurn);
  const endMessage = useGameState((s) => s.endMessage);

  const currentPlayer = whosTurn !== null ? players[whosTurn]?.name : null;

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3 text-sm text-[#474633] text-center">
      {endMessage ? 'Game over' : currentPlayer ? `${currentPlayer}'s turn` : 'Loading...'}
    </div>
  );
}

interface GamePageProps {
  gameKey: string;
  playerKey?: string;
}

export function GamePage({ gameKey, playerKey: playerKeyProp }: GamePageProps) {
  const setGameData = useGameState((s) => s.setGameData);
  const applyTurn = useGameState((s) => s.applyTurn);
  const addChatMessage = useGameState((s) => s.addChatMessage);
  const updateMyRack = useGameState((s) => s.updateMyRack);
  const setEndMessage = useGameState((s) => s.setEndMessage);
  const setError = useGameState((s) => s.setError);
  const board = useGameState((s) => s.board);
  const selectedSquare = useGameState((s) => s.selectedSquare);
  const clearSelection = useGameState((s) => s.clearSelection);
  const addPendingPlacement = useGameState((s) => s.addPendingPlacement);
  const getMyRack = useGameState((s) => s.getMyRack);
  const pendingPlacements = useGameState((s) => s.pendingPlacements);
  const playerKey = useGameState((s) => s.playerKey);
  const playerIndex = useGameState((s) => s.playerIndex);
  const isSpectator = playerIndex === null;

  const [blankPicker, setBlankPicker] = useState<{
    rackIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const [activeDragTile, setActiveDragTile] = useState<{ letter: string; score: number } | null>(null);

  // Clear stale state immediately when game key changes (prevents old endMessage flashing)
  useEffect(() => {
    useGameState.setState({ endMessage: null, board: null, error: null });
  }, [gameKey]);

  // Socket setup + load game data (join room before loading to avoid missing events)
  useEffect(() => {
    let cancelled = false;
    const socket = getSocket();

    socket.on('turn', (turn) => applyTurn(turn));
    socket.on('rack', (rack) => updateMyRack(rack));
    socket.on('gameEnded', (msg) => setEndMessage(msg));
    socket.on('message', (msg) => addChatMessage(msg));
    socket.on('nextGame', (nextGameKey: string) => {
      const state = useGameState.getState();
      if (state.endMessage) {
        setEndMessage({ ...state.endMessage, nextGameKey });
      }
    });

    // Join socket room first, then load game data so we never miss events
    joinGame(gameKey, playerKeyProp || playerKey || undefined).then(() => {
      if (cancelled) return;
      api
        .getGame(gameKey, playerKeyProp)
        .then((data) => { if (!cancelled) setGameData(data, playerKeyProp); })
        .catch((e) => { if (!cancelled) setError(e.message); });
    });

    return () => {
      cancelled = true;
      socket.off('turn');
      socket.off('rack');
      socket.off('gameEnded');
      socket.off('message');
      socket.off('nextGame');
    };
  }, [gameKey, playerKeyProp, playerKey, applyTurn, updateMyRack, setEndMessage, addChatMessage, setGameData, setError]);

  const [mobileTab, setMobileTab] = useState<'score' | 'log' | 'chat'>('score');

  useNotifications();

  // Place tile from rack to board via click-to-select
  const handleBoardClickForPlacement = useCallback(
    (x: number, y: number) => {
      const state = useGameState.getState();
      if (!state.isMyTurn()) return;
      if (!state.selectedSquare?.fromRack) return;

      const rackIndex = state.selectedSquare.x;
      const rack = state.getMyRack();
      const tile = rack[rackIndex];
      if (!tile) return;

      // Check board square is empty
      if (state.board?.[x]?.[y]?.tile) return;
      if (state.pendingPlacements.find((p) => p.x === x && p.y === y)) return;

      if (tile.score === 0) {
        // Blank tile - show picker
        setBlankPicker({ rackIndex, x, y });
      } else {
        addPendingPlacement({
          letter: tile.letter,
          score: tile.score,
          x,
          y,
          blank: false,
          rackIndex,
        });
      }
      clearSelection();
    },
    [addPendingPlacement, clearSelection],
  );

  const handleBlankSelect = (letter: string) => {
    if (!blankPicker) return;
    addPendingPlacement({
      letter,
      score: 0,
      x: blankPicker.x,
      y: blankPicker.y,
      blank: true,
      rackIndex: blankPicker.rackIndex,
    });
    setBlankPicker(null);
  };

  const reorderRack = useGameState((s) => s.reorderRack);
  const shuffleRack = useGameState((s) => s.shuffleRack);
  const clearPendingPlacements = useGameState((s) => s.clearPendingPlacements);

  const removePendingPlacement = useGameState((s) => s.removePendingPlacement);

  // DnD handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = String(event.active.id);
      if (activeId.startsWith('rack-')) {
        const rackIndex = parseInt(activeId.replace('rack-', ''), 10);
        const state = useGameState.getState();
        const rack = state.getMyRack();
        const tile = rack[rackIndex];
        if (tile) {
          setActiveDragTile({ letter: tile.letter, score: tile.score });
        }
      } else if (activeId.startsWith('pending-')) {
        const [, px, py] = activeId.split('-').map(Number);
        const state = useGameState.getState();
        const pending = state.pendingPlacements.find((p) => p.x === px && p.y === py);
        if (pending) {
          setActiveDragTile({ letter: pending.letter, score: pending.score });
        }
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragTile(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Rack tile dragged to a board square (only when it's my turn)
      if (activeId.startsWith('rack-') && overId.startsWith('board-')) {
        if (!useGameState.getState().isMyTurn()) return;
        const rackIndex = parseInt(activeId.replace('rack-', ''), 10);
        const [, bx, by] = overId.split('-').map(Number);
        const state = useGameState.getState();
        const rack = state.getMyRack();
        const tile = rack[rackIndex];
        if (!tile) return;
        if (state.board?.[bx]?.[by]?.tile) return;
        if (state.pendingPlacements.find((p) => p.x === bx && p.y === by)) return;

        if (tile.score === 0) {
          setBlankPicker({ rackIndex, x: bx, y: by });
        } else {
          addPendingPlacement({
            letter: tile.letter,
            score: tile.score,
            x: bx,
            y: by,
            blank: false,
            rackIndex,
          });
        }
      }

      // Pending board tile dragged to another board square (only when it's my turn)
      if (activeId.startsWith('pending-') && overId.startsWith('board-')) {
        if (!useGameState.getState().isMyTurn()) return;
        const [, px, py] = activeId.split('-').map(Number);
        const [, bx, by] = overId.split('-').map(Number);
        const state = useGameState.getState();
        if (state.board?.[bx]?.[by]?.tile) return;
        if (state.pendingPlacements.find((p) => p.x === bx && p.y === by)) return;
        const pending = state.pendingPlacements.find((p) => p.x === px && p.y === py);
        if (!pending) return;
        removePendingPlacement(px, py);
        addPendingPlacement({ ...pending, x: bx, y: by });
      }

      // Pending board tile dragged back to rack
      if (activeId.startsWith('pending-') && overId.startsWith('rack-')) {
        const [, px, py] = activeId.split('-').map(Number);
        const originalRackIndex = removePendingPlacement(px, py);
        const targetRackIndex = parseInt(overId.replace('rack-', ''), 10);
        if (originalRackIndex !== -1 && originalRackIndex !== targetRackIndex) {
          reorderRack(originalRackIndex, targetRackIndex);
        }
      }

      // Rack reorder
      if (activeId.startsWith('rack-') && overId.startsWith('rack-')) {
        const fromIndex = parseInt(activeId.replace('rack-', ''), 10);
        const toIndex = parseInt(overId.replace('rack-', ''), 10);
        if (fromIndex !== toIndex) {
          reorderRack(fromIndex, toIndex);
        }
      }
    },
    [addPendingPlacement, removePendingPlacement, reorderRack],
  );

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameState.getState();
      if (!state.cursor || !state.board || !state.isMyTurn()) return;

      const { cursor, legalLetters } = state;
      const letter = e.key.toUpperCase();

      if (legalLetters.includes(letter)) {
        // Find this letter in the rack
        const rack = state.getMyRack();
        const placedIndices = new Set(state.pendingPlacements.map((p) => p.rackIndex));
        let rackIndex = rack.findIndex(
          (t, i) => t && !placedIndices.has(i) && t.letter === letter,
        );

        // If no matching letter tile, use a blank tile instead
        let useBlank = false;
        if (rackIndex === -1) {
          rackIndex = rack.findIndex(
            (t, i) => t && !placedIndices.has(i) && t.score === 0,
          );
          if (rackIndex !== -1) useBlank = true;
        }

        if (rackIndex !== -1) {
          const sq = state.board[cursor.x]?.[cursor.y];
          if (sq && !sq.tile && !state.pendingPlacements.find((p) => p.x === cursor.x && p.y === cursor.y)) {
            addPendingPlacement({
              letter,
              score: useBlank ? 0 : rack[rackIndex]!.score,
              x: cursor.x,
              y: cursor.y,
              blank: useBlank,
              rackIndex,
            });

            // Advance cursor to next free square in cursor direction
            const updatedState = useGameState.getState();
            let nx = cursor.x;
            let ny = cursor.y;
            do {
              nx += cursor.horizontal ? 1 : 0;
              ny += cursor.horizontal ? 0 : 1;
            } while (
              nx < 15 && ny < 15 &&
              (updatedState.board![nx][ny].tile || updatedState.pendingPlacements.find((p) => p.x === nx && p.y === ny))
            );
            if (nx < 15 && ny < 15) {
              updatedState.setCursor({ x: nx, y: ny, horizontal: cursor.horizontal });
            }
          }
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        useGameState.getState().setCursor({
          ...cursor,
          horizontal: !cursor.horizontal,
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        // Remove last placed tile at or before cursor
        const pp = state.pendingPlacements;
        if (pp.length > 0) {
          const last = pp[pp.length - 1];
          useGameState.getState().removePendingPlacement(last.x, last.y);
          useGameState.getState().setCursor({ x: last.x, y: last.y, horizontal: cursor.horizontal });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        let nx = cursor.x;
        do { nx++; } while (nx < 15 && (state.board![nx]?.[cursor.y]?.tile || state.pendingPlacements.find((p) => p.x === nx && p.y === cursor.y)));
        if (nx < 15) useGameState.getState().setCursor({ ...cursor, x: nx });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let nx = cursor.x;
        do { nx--; } while (nx >= 0 && (state.board![nx]?.[cursor.y]?.tile || state.pendingPlacements.find((p) => p.x === nx && p.y === cursor.y)));
        if (nx >= 0) useGameState.getState().setCursor({ ...cursor, x: nx });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let ny = cursor.y;
        do { ny++; } while (ny < 15 && (state.board![cursor.x]?.[ny]?.tile || state.pendingPlacements.find((p) => p.x === cursor.x && p.y === ny)));
        if (ny < 15) useGameState.getState().setCursor({ ...cursor, y: ny });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let ny = cursor.y;
        do { ny--; } while (ny >= 0 && (state.board![cursor.x]?.[ny]?.tile || state.pendingPlacements.find((p) => p.x === cursor.x && p.y === ny)));
        if (ny >= 0) useGameState.getState().setCursor({ ...cursor, y: ny });
      } else if (e.key === 'Escape') {
        useGameState.getState().setCursor(null);
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addPendingPlacement, clearSelection]);

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Rack tile IDs for sortable (only include tiles actually present, not placed on board)
  const rack = getMyRack();
  const placedIndices = new Set(pendingPlacements.map((p) => p.rackIndex));
  const rackIds = rack
    .map((tile, i) => (tile && !placedIndices.has(i) ? `rack-${i}` : null))
    .filter((id): id is string => id !== null);

  if (!board) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-700">Loading game...</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-amber-50 flex flex-col">
        {/* Desktop layout */}
        <div className="max-w-[59rem] mx-auto p-2 flex flex-col lg:flex-row gap-4 flex-1 w-full">
          {/* Controls sidebar - hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:w-[20rem] space-y-3 order-1">
            <Scoreboard />
            <MoveLog />
            {!isSpectator && <ChatPanel />}
            {isSpectator ? <SpectatorTurnStatus /> : <TurnControls />}
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center gap-3 order-1 lg:order-2">
            <div className="flex flex-col items-center gap-2" onClick={(e) => {
              const target = e.target as HTMLElement;
              const boardSquare = target.closest('[data-board-square]');
              if (boardSquare) {
                const x = Number(boardSquare.getAttribute('data-x'));
                const y = Number(boardSquare.getAttribute('data-y'));
                handleBoardClickForPlacement(x, y);
              }
            }}>
              <Board />
              {/* Rack with Shuffle/Recall buttons to the left */}
              {!isSpectator && (
                <div className="flex items-center gap-1 w-[calc(100vw-1rem)] max-w-[min(37rem,100%)] lg:w-[37rem]">
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={shuffleRack}
                      className="px-2 py-1 text-xs bg-[#54534A] text-[#AAA38E] rounded hover:text-white"
                      title="Shuffle"
                    >
                      Shuffle
                    </button>
                    {pendingPlacements.length > 0 && (
                      <button
                        onClick={() => { clearPendingPlacements(); useGameState.getState().setCursor(null); }}
                        className="px-2 py-1 text-xs bg-[#54534A] text-[#AAA38E] rounded hover:text-white"
                        title="Recall"
                      >
                        Recall
                      </button>
                    )}
                  </div>
                  <div className="@container flex-1 min-w-0">
                    <SortableContext items={rackIds} strategy={horizontalListSortingStrategy}>
                      <Rack />
                    </SortableContext>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile controls - tab interface */}
            <div className="lg:hidden w-full space-y-2">
              {isSpectator ? <SpectatorTurnStatus /> : <TurnControls />}
              <div className="flex border-b border-[#DCDCC6]">
                {(isSpectator ? (['score', 'log'] as const) : (['score', 'log', 'chat'] as const)).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMobileTab(tab as typeof mobileTab)}
                    className={`flex-1 py-2 text-xs font-medium capitalize ${
                      mobileTab === tab
                        ? 'text-[#474633] border-b-2 border-[#474633]'
                        : 'text-[#AAA38E]'
                    }`}
                  >
                    {tab === 'score' ? 'Score' : tab === 'log' ? 'Moves' : 'Chat'}
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

        {/* spacer */}
        <div className="pb-4" />
      </div>

      {blankPicker && (
        <BlankLetterPicker
          onSelect={handleBlankSelect}
          onCancel={() => setBlankPicker(null)}
        />
      )}
      <GameEndOverlay />
      <DragOverlay dropAnimation={null}>
        {activeDragTile && (
          <div className="@container" style={{ width: 592 }}>
            <div style={{ width: 'calc(100cqw / 15)', aspectRatio: '1' }}>
              <Tile
                letter={activeDragTile.letter}
                score={activeDragTile.score}
                isBlank={activeDragTile.score === 0}
              />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
