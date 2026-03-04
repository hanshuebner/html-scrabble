import { create } from 'zustand';

export interface TileData {
  letter: string;
  score: number;
}

export interface SquareData {
  type: string;
  x: number;
  y: number;
  tile: TileData | null;
  tileLocked: boolean;
}

export interface PlayerData {
  name: string;
  score: number;
  rack: { tile: TileData | null }[] | null;
}

export interface TurnData {
  type: string;
  player?: number;
  playerIndex?: number;
  score: number;
  move?: { words: { word: string; score: number }[] };
  moveData?: { words?: { word: string; score: number }[] };
  placements?: { letter: string; x: number; y: number; blank: boolean }[];
  count?: number;
  timestamp?: string;
  whosTurn?: number;
  remainingTileCounts?: { letterBag: number; players: number[] };
}

export interface ChatMessage {
  playerName: string;
  message: string;
}

interface CursorState {
  x: number;
  y: number;
  horizontal: boolean;
}

interface GameState {
  // Game data
  gameKey: string | null;
  playerKey: string | null;
  playerIndex: number | null;
  language: string;
  board: SquareData[][] | null;
  players: PlayerData[];
  turns: TurnData[];
  whosTurn: number | null;
  legalLetters: string;
  remainingTileCounts: { letterBag: number; players: number[] } | null;
  endMessage: any | null;

  // UI state
  selectedSquare: { x: number; y: number; fromRack: boolean } | null;
  cursor: CursorState | null;
  pendingPlacements: { letter: string; score: number; x: number; y: number; blank: boolean; rackIndex: number }[];
  chatMessages: ChatMessage[];
  error: string | null;
  loading: boolean;

  // Actions
  setGameData: (data: any, playerKey?: string) => void;
  applyTurn: (turn: TurnData) => void;
  selectSquare: (x: number, y: number, fromRack: boolean) => void;
  clearSelection: () => void;
  setCursor: (cursor: CursorState | null) => void;
  addPendingPlacement: (placement: { letter: string; score: number; x: number; y: number; blank: boolean; rackIndex: number }) => void;
  removePendingPlacement: (x: number, y: number) => number;
  clearPendingPlacements: () => void;
  applyOwnMove: (placements: { letter: string; score: number; x: number; y: number; rackIndex: number }[], newTiles: { letter: string; score: number }[]) => void;
  reorderRack: (fromIndex: number, toIndex: number) => void;
  shuffleRack: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setEndMessage: (msg: any) => void;

  // Helpers
  isMyTurn: () => boolean;
  getMyRack: () => (TileData | null)[];
}

export const useGameState = create<GameState>((set, get) => ({
  gameKey: null,
  playerKey: null,
  playerIndex: null,
  language: 'English',
  board: null,
  players: [],
  turns: [],
  whosTurn: null,
  legalLetters: '',
  remainingTileCounts: null,
  endMessage: null,

  selectedSquare: null,
  cursor: null,
  pendingPlacements: [],
  chatMessages: [],
  error: null,
  loading: false,

  setGameData: (data, playerKey) => {
    const playerIndex = playerKey
      ? data.players.findIndex((_: any, i: number) => data.players[i].rack !== null)
      : null;

    set({
      gameKey: data.key,
      playerKey: playerKey || null,
      playerIndex,
      language: data.language,
      board: data.board,
      players: data.players,
      turns: data.turns || [],
      whosTurn: data.whosTurn ?? null,
      legalLetters: data.legalLetters || '',
      remainingTileCounts: data.remainingTileCounts || null,
      endMessage: data.endMessage || null,
      pendingPlacements: [],
      error: null,
    });
  },

  applyTurn: (turn) => {
    set((state) => {
      // Apply tile placements to the board
      let board = state.board;
      if (board && turn.placements && turn.type === 'move') {
        board = board.map((col) => col.map((sq) => ({ ...sq })));
        for (const p of turn.placements) {
          board[p.x][p.y] = {
            ...board[p.x][p.y],
            tile: { letter: p.letter, score: p.blank ? 0 : (board[p.x][p.y].tile?.score ?? 1) },
            tileLocked: true,
          };
        }
      }
      // Reverse placements on challenge/takeBack
      if (board && turn.placements && (turn.type === 'challenge' || turn.type === 'takeBack')) {
        board = board.map((col) => col.map((sq) => ({ ...sq })));
        for (const p of turn.placements) {
          board[p.x][p.y] = { ...board[p.x][p.y], tile: null, tileLocked: false };
        }
      }

      // Update player scores
      const turnPlayerIndex = turn.player ?? turn.playerIndex ?? 0;
      const players = state.players.map((p, i) => {
        if (i === turnPlayerIndex) {
          return { ...p, score: p.score + (turn.score || 0) };
        }
        return p;
      });

      return {
        board,
        players,
        turns: [...state.turns, turn],
        whosTurn: turn.whosTurn ?? state.whosTurn,
        remainingTileCounts: turn.remainingTileCounts || state.remainingTileCounts,
        pendingPlacements: [],
      };
    });
  },

  selectSquare: (x, y, fromRack) => set({ selectedSquare: { x, y, fromRack } }),
  clearSelection: () => set({ selectedSquare: null }),
  setCursor: (cursor) => set({ cursor }),

  addPendingPlacement: (placement) =>
    set((state) => ({
      pendingPlacements: [...state.pendingPlacements, placement],
    })),

  removePendingPlacement: (x, y) => {
    const state = get();
    const idx = state.pendingPlacements.findIndex((p) => p.x === x && p.y === y);
    if (idx !== -1) {
      const placement = state.pendingPlacements[idx];
      set({
        pendingPlacements: state.pendingPlacements.filter((_, i) => i !== idx),
      });
      return placement.rackIndex;
    }
    return -1;
  },

  clearPendingPlacements: () => set({ pendingPlacements: [] }),
  applyOwnMove: (placements, newTiles) => {
    set((state) => {
      // Lock placed tiles on board
      let board = state.board;
      if (board) {
        board = board.map((col) => col.map((sq) => ({ ...sq })));
        for (const p of placements) {
          board[p.x][p.y] = {
            ...board[p.x][p.y],
            tile: { letter: p.letter, score: p.score },
            tileLocked: true,
          };
        }
      }

      // Update rack: replace placed tiles with new tiles
      if (state.playerIndex !== null) {
        const player = state.players[state.playerIndex];
        if (player?.rack) {
          const newRack = player.rack.map((sq) => ({ ...sq }));
          for (let i = 0; i < placements.length; i++) {
            newRack[placements[i].rackIndex] = {
              tile: i < newTiles.length ? newTiles[i] : null,
            };
          }
          const newPlayers = [...state.players];
          newPlayers[state.playerIndex] = { ...player, rack: newRack };
          return { board, players: newPlayers, pendingPlacements: [] };
        }
      }

      return { board, pendingPlacements: [] };
    });
  },
  reorderRack: (fromIndex, toIndex) => {
    const state = get();
    if (state.playerIndex === null) return;
    const player = state.players[state.playerIndex];
    if (!player?.rack) return;
    const newRack = [...player.rack];
    const placedIndices = new Set(state.pendingPlacements.map((p) => p.rackIndex));
    if (!newRack[toIndex]?.tile || placedIndices.has(toIndex)) {
      // Target is empty — swap
      [newRack[fromIndex], newRack[toIndex]] = [newRack[toIndex], newRack[fromIndex]];
    } else {
      // Both filled — splice reorder
      const [moved] = newRack.splice(fromIndex, 1);
      newRack.splice(toIndex, 0, moved);
    }
    const newPlayers = [...state.players];
    newPlayers[state.playerIndex] = { ...player, rack: newRack };
    set({ players: newPlayers });
  },
  shuffleRack: () => {
    const state = get();
    if (state.playerIndex === null) return;
    const player = state.players[state.playerIndex];
    if (!player?.rack) return;
    const newRack = [...player.rack];
    for (let i = newRack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newRack[i], newRack[j]] = [newRack[j], newRack[i]];
    }
    const newPlayers = [...state.players];
    newPlayers[state.playerIndex] = { ...player, rack: newRack };
    set({ players: newPlayers });
  },
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),
  setEndMessage: (endMessage) => set({ endMessage }),

  isMyTurn: () => {
    const state = get();
    return state.playerIndex !== null && state.whosTurn === state.playerIndex;
  },

  getMyRack: () => {
    const state = get();
    if (state.playerIndex === null) return [];
    const rackData = state.players[state.playerIndex]?.rack;
    if (!rackData) return [];
    return rackData.map((sq) => sq.tile);
  },
}));
