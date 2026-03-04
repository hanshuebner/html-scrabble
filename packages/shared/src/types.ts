export type SquareType = 'Normal' | 'DoubleLetter' | 'TripleLetter' | 'DoubleWord' | 'TripleWord';

export type Language =
  | 'English'
  | 'French'
  | 'German'
  | 'Hungarian'
  | 'Nederlands'
  | 'Czech'
  | 'Estonian'
  | 'Portuguese'
  | 'Slovenian'
  | 'Test';

export interface LetterDefinition {
  letter?: string;
  score: number;
  count: number;
}

export interface TilePlacement {
  letter: string;
  x: number;
  y: number;
  blank: boolean;
}

export interface WordScore {
  word: string;
  score: number;
}

export interface MoveResult {
  error?: string;
  score?: number;
  words?: WordScore[];
  tilesPlaced?: TilePlacement[];
  allTilesBonus?: boolean;
}

export interface TurnData {
  type: 'move' | 'pass' | 'swap' | 'challenge' | 'takeBack';
  player: number;
  score: number;
  move?: MoveResult;
  placements?: TilePlacement[];
  count?: number;
  challenger?: number;
  whosTurn?: number;
  returnLetters?: string[];
  timestamp?: string;
  remainingTileCounts?: {
    letterBag: number;
    players: number[];
  };
}

export interface EndMessage {
  reason: string;
  nextGameKey?: string;
  players: {
    name: string;
    score: number;
    tallyScore?: number;
    rack: { squares: { tile: { letter: string; score: number } | null }[] };
  }[];
}

export interface PlayerData {
  name: string;
  email: string;
  key: string;
  index: number;
  score: number;
  rack: import('./rack.js').Rack;
  tallyScore?: number;
}

export interface GameState {
  board: number[][];
  turns: TurnData[];
  language: Language;
  whosTurn?: number;
  remainingTileCounts: {
    letterBag: number;
    players: number[];
  };
  legalLetters: string;
  players: {
    name: string;
    score: number;
    rack: import('./rack.js').Rack | null;
  }[];
  endMessage?: EndMessage;
}
