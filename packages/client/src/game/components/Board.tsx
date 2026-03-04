import { useCallback } from 'react';
import { BoardSquare } from './BoardSquare.js';
import { useGameState } from '../hooks/useGameState.js';

export function Board() {
  const board = useGameState((s) => s.board);
  const pendingPlacements = useGameState((s) => s.pendingPlacements);
  const cursor = useGameState((s) => s.cursor);
  const selectedSquare = useGameState((s) => s.selectedSquare);
  const setCursor = useGameState((s) => s.setCursor);
  const selectSquare = useGameState((s) => s.selectSquare);
  const clearSelection = useGameState((s) => s.clearSelection);
  const isMyTurn = useGameState((s) => s.isMyTurn);

  const handleSquareClick = useCallback(
    (x: number, y: number) => {
      const sq = board?.[x]?.[y];
      if (!sq) return;

      // If we have a selected tile from the rack, let GamePage's handler deal with placement
      if (selectedSquare?.fromRack) return;

      // Cursor and tile selection only available on your turn
      if (!isMyTurn()) return;

      // If clicking an empty square, set/toggle cursor
      if (!sq.tile && !pendingPlacements.find((p) => p.x === x && p.y === y)) {
        if (cursor && cursor.x === x && cursor.y === y) {
          // Toggle horizontal→vertical, then remove
          if (cursor.horizontal) {
            setCursor({ x, y, horizontal: false });
          } else {
            setCursor(null);
          }
        } else {
          // Always start horizontal
          setCursor({ x, y, horizontal: true });
        }
        clearSelection();
        return;
      }

      // If clicking a pending (unlocked) tile, select it
      const pending = pendingPlacements.find((p) => p.x === x && p.y === y);
      if (pending) {
        selectSquare(x, y, false);
      }
    },
    [board, cursor, selectedSquare, pendingPlacements, setCursor, selectSquare, clearSelection, isMyTurn],
  );

  if (!board) return null;

  // Build flat list of squares for the grid
  const squares: React.ReactElement[] = [];
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 15; x++) {
      const sq = board[x][y];
      const pending = pendingPlacements.find((p) => p.x === x && p.y === y);
      const isCursor = cursor !== null && cursor.x === x && cursor.y === y;
      const isSelected =
        selectedSquare !== null &&
        !selectedSquare.fromRack &&
        selectedSquare.x === x &&
        selectedSquare.y === y;

      const displayTile = pending
        ? { letter: pending.letter, score: pending.score }
        : sq.tile;

      squares.push(
        <BoardSquare
          key={`${x}-${y}`}
          x={x}
          y={y}
          type={sq.type}
          tile={displayTile}
          tileLocked={sq.tileLocked}
          isPending={!!pending}
          isSelected={isSelected}
          isCursor={isCursor && !displayTile}
          cursorHorizontal={cursor?.horizontal}
          onClick={() => handleSquareClick(x, y)}
        />,
      );
    }
  }

  return (
    <div className="@container grid grid-cols-[repeat(15,1fr)] gap-0 w-[calc(100vw-1rem)] max-w-[min(37rem,100%)] aspect-square bg-[#54534A] p-[2px] rounded shadow-lg lg:w-[37rem]">
      {squares}
    </div>
  );
}
