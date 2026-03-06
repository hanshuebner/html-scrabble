import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import { Tile } from './Tile.js'
import { useGameState, type TileData } from '../hooks/useGameState.js'

const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.wasDragging) return false
  return defaultAnimateLayoutChanges(args)
}

const SortableRackTile = ({
  tile,
  id,
  isSelected,
  onClick,
}: {
  tile: TileData
  id: string
  isSelected: boolean
  onClick: () => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    animateLayoutChanges,
  })

  const tileStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={{ width: 'var(--tile-size, calc(100cqw / 15))' }}
      className="aspect-square bg-[#F7F7E3]/20 border border-[#DCDCC6]/30 rounded-sm"
    >
      <div
        style={{ ...tileStyle, touchAction: 'none' }}
        className="w-full h-full"
        {...attributes}
        {...listeners}
        onClick={onClick}
      >
        <Tile
          letter={tile.letter}
          score={tile.score}
          isBlank={tile.score === 0}
          isSelected={isSelected}
          isDragging={isDragging}
        />
      </div>
    </div>
  )
}

const EmptyRackSlot = ({ id, onClick }: { id: string; onClick?: () => void }) => {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className="aspect-square bg-[#F7F7E3]/20 border border-[#DCDCC6]/30 rounded-sm"
      style={{ width: 'var(--tile-size, calc(100cqw / 15))' }}
      onClick={onClick}
    />
  )
}

export const Rack = () => {
  const selectedSquare = useGameState((s) => s.selectedSquare)
  const selectSquare = useGameState((s) => s.selectSquare)
  const clearSelection = useGameState((s) => s.clearSelection)
  const removePendingPlacement = useGameState((s) => s.removePendingPlacement)
  const reorderRack = useGameState((s) => s.reorderRack)
  const swapMode = useGameState((s) => s.swapMode)
  const swapIndices = useGameState((s) => s.swapIndices)
  const toggleSwapTile = useGameState((s) => s.toggleSwapTile)

  const playerIndex = useGameState((s) => s.playerIndex)
  const whosTurn = useGameState((s) => s.whosTurn)
  const rackSlots = useGameState((s) => (s.playerIndex !== null ? s.players[s.playerIndex]?.rack : null))

  const isMyTurn = whosTurn === playerIndex

  const handleEmptySlotClick = (targetIndex: number) => {
    if (selectedSquare && !selectedSquare.fromRack) {
      // Return a pending board tile to this rack position
      const restoredSlotId = removePendingPlacement(selectedSquare.x, selectedSquare.y)
      if (restoredSlotId) {
        const slots = useGameState.getState().getMyRackSlots()
        const originalRackIndex = slots.findIndex((s) => s.id === restoredSlotId)
        if (originalRackIndex !== -1 && originalRackIndex !== targetIndex) {
          reorderRack(originalRackIndex, targetIndex)
        }
      }
      clearSelection()
    } else if (selectedSquare?.fromRack) {
      // Move a selected rack tile to this empty slot
      reorderRack(selectedSquare.x, targetIndex)
      clearSelection()
    }
  }

  const handleTileClick = (index: number) => {
    if (swapMode) {
      if (!isMyTurn) return
      toggleSwapTile(index)
      return
    }
    if (selectedSquare?.fromRack && selectedSquare.x === index) {
      clearSelection()
    } else {
      selectSquare(index, -1, true)
    }
  }

  const { t } = useTranslation()

  if (playerIndex === null) {
    return (
      <div className="text-center text-sm text-[#AAA38E] py-3">
        {t('Spectating — use your player link to join as a player.')}
      </div>
    )
  }

  return (
    <div className="flex gap-1 justify-center">
      {(rackSlots ?? []).map((slot, i) => {
        if (!slot.tile) {
          return <EmptyRackSlot key={slot.id} id={slot.id} onClick={() => handleEmptySlotClick(i)} />
        }

        // In swap mode, selected tiles show as empty slots
        if (swapMode && swapIndices.has(i)) {
          return <EmptyRackSlot key={slot.id} id={slot.id} />
        }

        const isSelected = selectedSquare?.fromRack && selectedSquare.x === i

        return (
          <SortableRackTile
            key={slot.id}
            id={slot.id}
            tile={slot.tile}
            isSelected={!!isSelected}
            onClick={() => handleTileClick(i)}
          />
        )
      })}
    </div>
  )
}
