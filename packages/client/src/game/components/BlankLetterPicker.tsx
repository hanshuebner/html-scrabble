import { useGameState } from '../hooks/useGameState.js';

interface BlankLetterPickerProps {
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

export function BlankLetterPicker({ onSelect, onCancel }: BlankLetterPickerProps) {
  const legalLetters = useGameState((s) => s.legalLetters);

  const letters = legalLetters.split('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#F7F7E3] rounded-lg p-4 max-w-sm shadow-xl">
        <h3 className="text-sm font-bold text-[#474633] mb-3">Choose a letter for the blank:</h3>
        <div className="grid grid-cols-7 gap-1">
          {letters.map((letter) => (
            <button
              key={letter}
              onClick={() => onSelect(letter)}
              className="w-9 h-9 text-sm font-bold bg-white border border-[#DCDCC6] rounded hover:bg-[#FBBBB9] transition-colors"
            >
              {letter}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-3 w-full text-sm py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
