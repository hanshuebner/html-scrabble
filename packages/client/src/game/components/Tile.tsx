import { memo } from 'react';

interface TileProps {
  letter: string;
  score: number;
  isBlank?: boolean;
  isSelected?: boolean;
  isNew?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
}

export const Tile = memo(function Tile({
  letter,
  score,
  isBlank,
  isSelected,
  isNew,
  isDragging,
  onClick,
}: TileProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full rounded-sm cursor-pointer select-none overflow-hidden
        bg-[#F7F7E3] border border-[#DCDCC6]
        text-[#474633]
        ${isBlank ? 'border-l-[#ADFF2F] border-r-[#ADFF2F] border-l-2 border-r-2' : ''}
        ${isSelected ? 'ring-2 ring-orange-400 animate-pulse' : ''}
        ${isNew ? 'shadow-md' : ''}
        ${isDragging ? 'opacity-0' : ''}
        transition-shadow duration-150
      `}
    >
      <span
        className="block font-normal leading-none"
        style={{
          fontSize: '4.2cqw',
          marginTop: '0.15em',
          paddingLeft: letter === 'I' ? '0.55em' : '0.22em',
          textAlign: 'left',
        }}
      >
        {letter}
      </span>
      {score > 0 && (
        <span
          className="absolute font-normal leading-none"
          style={{ fontSize: '2.0cqw', bottom: '0.1em', right: '0.15em' }}
        >
          {score}
        </span>
      )}
    </div>
  );
});
