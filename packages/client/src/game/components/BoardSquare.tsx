import { memo } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useTranslation } from 'react-i18next'
import { Tile } from './Tile.js'

const SQUARE_FULL: Record<string, string> = {
  DoubleWord: 'Double Word Score',
  TripleWord: 'Triple Word Score',
  DoubleLetter: 'Double Letter Score',
  TripleLetter: 'Triple Letter Score',
}

const SQUARE_BG: Record<string, string> = {
  Normal: 'bg-[#BEB9A6]',
  DoubleWord: 'bg-[#FBBBB9]',
  TripleWord: 'bg-[#F75D59]',
  DoubleLetter: 'bg-[#A0CFEC]',
  TripleLetter: 'bg-[#157DEC]',
}

const SQUARE_TEXT: Record<string, string> = {
  Normal: 'text-[#AAA38E]',
  DoubleWord: 'text-[#F75D59]',
  TripleWord: 'text-[#8B0000]',
  DoubleLetter: 'text-[#157DEC]',
  TripleLetter: 'text-[#000080]',
}

const DraggablePendingTile = ({
  x,
  y,
  tile,
  isSelected,
}: {
  x: number
  y: number
  tile: { letter: string; score: number }
  isSelected?: boolean
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pending-${x}-${y}`,
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="w-full h-full flex items-center justify-center" style={{ touchAction: 'none' }}>
      <Tile
        letter={tile.letter}
        score={tile.score}
        isBlank={tile.score === 0}
        isSelected={isSelected}
        isNew
        isDragging={isDragging}
      />
    </div>
  )
}

interface BoardSquareProps {
  x: number
  y: number
  type: string
  tile: { letter: string; score: number } | null
  tileLocked: boolean
  isPending?: boolean
  isSelected?: boolean
  isCursor?: boolean
  cursorHorizontal?: boolean
  isMyTurn?: boolean
  onClick?: () => void
}

export const BoardSquare = memo(
  ({
    x,
    y,
    type,
    tile,
    tileLocked,
    isPending,
    isSelected,
    isCursor,
    cursorHorizontal,
    isMyTurn,
    onClick,
  }: BoardSquareProps) => {
    const { setNodeRef, isOver } = useDroppable({ id: `board-${x}-${y}`, disabled: !isMyTurn })
    const { t } = useTranslation()

    const bg = SQUARE_BG[type] || SQUARE_BG.Normal
    const fullLabel = SQUARE_FULL[type]
    const textColor = SQUARE_TEXT[type] || SQUARE_TEXT.Normal
    const isCenter = x === 7 && y === 7
    const isSpecial = type !== 'Normal'
    const borderClass = isSpecial
      ? 'border border-dotted border-[#54534A]'
      : 'border border-solid border-[#AAA38E]'

    return (
      <div
        ref={setNodeRef}
        onClick={onClick}
        data-board-square
        data-x={x}
        data-y={y}
        className={`
        relative flex items-center justify-center
        ${borderClass}
        ${bg}
        aspect-square overflow-hidden
      `}
      >
        {tile ? (
          isPending ? (
            <DraggablePendingTile x={x} y={y} tile={tile} isSelected={isSelected} />
          ) : (
            <Tile
              letter={tile.letter}
              score={tile.score}
              isBlank={tile.score === 0}
              isSelected={isSelected}
              isNew={!tileLocked}
            />
          )
        ) : (
          <>
            {fullLabel && (
              <span
                className={`font-bold font-board-label ${textColor} leading-tight text-center text-[1.1cqw] uppercase`}
              >
                {t(fullLabel)
                  .split(' ')
                  .map((word, i) => (
                    <div key={i}>{word}</div>
                  ))}
              </span>
            )}
            {isCenter && !fullLabel && <span className={`text-[clamp(0.5rem,3.5cqw,1rem)] ${textColor}`}>★</span>}
          </>
        )}
        {isOver && <span className="absolute inset-0 bg-white/50 pointer-events-none" />}
        {isCursor && (
          <span className="absolute inset-0 flex items-center justify-center text-[clamp(0.7rem,5cqw,1.8rem)] font-bold text-[#54534A] bg-white/50 pointer-events-none">
            {cursorHorizontal ? '\u25b6' : '\u25bc'}
          </span>
        )}
      </div>
    )
  },
)
BoardSquare.displayName = 'BoardSquare'
