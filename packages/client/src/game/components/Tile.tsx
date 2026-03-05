import { memo } from 'react'

interface TileProps {
  letter: string
  score: number
  isBlank?: boolean
  isSelected?: boolean
  isNew?: boolean
  isDragging?: boolean
  onClick?: () => void
}

export const Tile = memo(({ letter, score, isBlank, isSelected, isNew, isDragging, onClick }: TileProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        font-tile w-full h-full rounded-sm cursor-pointer select-none
        bg-[#F7F7E3] border border-[#DCDCC6]
        text-[#474633]
        flex items-center justify-center
        ${isBlank ? 'border-l-[#ADFF2F] border-r-[#ADFF2F] border-l-2 border-r-2' : ''}
        ${isSelected ? 'ring-2 ring-orange-400 animate-pulse' : ''}
        ${isNew ? 'shadow-md' : ''}
        ${isDragging ? 'opacity-0' : ''}
        transition-shadow duration-150
      `}
      style={{ fontSize: '3.5cqw' }}
    >
      <span style={{ display: 'inline' }}>
        <span
          className="font-normal"
          style={{
            fontSize: '1.2em',
            paddingLeft: '0.2em',
          }}
        >
          {letter}
        </span>
        {score > 0 && (
          <span
            className="font-normal"
            style={{
              fontSize: '0.6em',
              verticalAlign: 'sub',
              paddingLeft: '0.2em',
            }}
          >
            {score}
          </span>
        )}
      </span>
    </div>
  )
})
Tile.displayName = 'Tile'
