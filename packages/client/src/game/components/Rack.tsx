import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tile } from './Tile.js';
import { useGameState, type TileData } from '../hooks/useGameState.js';

const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.wasDragging) return false;
  return defaultAnimateLayoutChanges(args);
};

function SortableRackTile({
  tile,
  index,
  isSelected,
  onClick,
}: {
  tile: TileData;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `rack-${index}`, animateLayoutChanges });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: 'calc(100cqw / 15)' }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="aspect-square"
    >
      <Tile
        letter={tile.letter}
        score={tile.score}
        isBlank={tile.score === 0}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  );
}

function EmptyRackSlot({ index }: { index: number }) {
  const { setNodeRef } = useDroppable({ id: `rack-${index}` });
  return (
    <div
      ref={setNodeRef}
      className="aspect-square border border-dashed border-[#AAA38E] rounded-sm"
      style={{ width: 'calc(100cqw / 15)' }}
    />
  );
}

export function Rack() {
  const selectedSquare = useGameState((s) => s.selectedSquare);
  const selectSquare = useGameState((s) => s.selectSquare);
  const clearSelection = useGameState((s) => s.clearSelection);
  const pendingPlacements = useGameState((s) => s.pendingPlacements);

  const playerIndex = useGameState((s) => s.playerIndex);
  const rackData = useGameState((s) => s.playerIndex !== null ? s.players[s.playerIndex]?.rack : null);
  const rack = rackData ? rackData.map((sq) => sq.tile) : [];

  // Tiles that are not currently placed on the board
  const placedRackIndices = new Set(pendingPlacements.map((p) => p.rackIndex));

  const handleTileClick = (index: number) => {
    if (selectedSquare?.fromRack && selectedSquare.x === index) {
      clearSelection();
    } else {
      selectSquare(index, -1, true);
    }
  };

  if (playerIndex === null) {
    return (
      <div className="text-center text-sm text-[#AAA38E] py-3">
        Spectating — use your player link to join as a player.
      </div>
    );
  }

  return (
    <div className="flex gap-1 justify-center p-2 bg-[#54534A] rounded shadow-md">
      {rack.map((tile, i) => {
        if (!tile || placedRackIndices.has(i)) {
          return <EmptyRackSlot key={i} index={i} />;
        }

        const isSelected =
          selectedSquare?.fromRack && selectedSquare.x === i;

        return (
          <SortableRackTile
            key={i}
            tile={tile}
            index={i}
            isSelected={!!isSelected}
            onClick={() => handleTileClick(i)}
          />
        );
      })}
    </div>
  );
}
