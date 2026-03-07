import { describe, it, expect } from 'vitest';
import { Board } from '../src/board.js';
import { Tile } from '../src/tile.js';
import { calculateMove } from '../src/move-calculator.js';

function placeTile(board: Board, x: number, y: number, letter: string, score: number, locked = false) {
  const tile = new Tile(letter, score);
  board.squares[x][y].placeTile(tile, locked);
}

describe('calculateMove', () => {
  it('returns error when start field is empty', () => {
    const board = new Board();
    placeTile(board, 0, 0, 'A', 1);
    const result = calculateMove(board.squares);
    expect(result.error).toBe('start field must be used');
  });

  it('returns error when no new tile found (all locked)', () => {
    const board = new Board();
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 8, 7, 'B', 3, true);
    const result = calculateMove(board.squares);
    expect(result.error).toBe('no new tile found');
  });

  it('returns error for single tile on first move', () => {
    const board = new Board();
    placeTile(board, 7, 7, 'A', 1);
    const result = calculateMove(board.squares);
    expect(result.error).toBe('first word must consist of at least two letters');
  });

  it('scores a simple horizontal word on center', () => {
    const board = new Board();
    // Place "CAT" starting at (6,7) through center
    placeTile(board, 6, 7, 'C', 3);
    placeTile(board, 7, 7, 'A', 1); // center = DoubleWord
    placeTile(board, 8, 7, 'T', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // C(3) + A(1) + T(1) = 5, doubled by center DoubleWord = 10
    expect(result.score).toBe(10);
    expect(result.words).toHaveLength(1);
    expect(result.words![0].word).toBe('CAT');
    expect(result.words![0].score).toBe(10);
    expect(result.tilesPlaced).toHaveLength(3);
    expect(result.tilesPlaced![0]).toMatchObject({ letter: 'C', score: 3 });
    expect(result.tilesPlaced![1]).toMatchObject({ letter: 'A', score: 1 });
    expect(result.tilesPlaced![2]).toMatchObject({ letter: 'T', score: 1 });
  });

  it('scores a simple vertical word on center', () => {
    const board = new Board();
    // Place "AT" vertically through center
    placeTile(board, 7, 7, 'A', 1); // center = DoubleWord
    placeTile(board, 7, 8, 'T', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // A(1) + T(1) = 2, doubled = 4
    expect(result.score).toBe(4);
    expect(result.words).toHaveLength(1);
    expect(result.words![0].word).toBe('AT');
  });

  it('applies DoubleLetter multiplier', () => {
    const board = new Board();
    // (6,6) is DoubleLetter. Place a locked word first, then extend.
    // First: place "HI" horizontally at (7,7)-(8,7) as locked
    placeTile(board, 7, 7, 'H', 4, true);
    placeTile(board, 8, 7, 'I', 1, true);

    // Now place a new tile at (6,6) which is DoubleLetter
    // and (6,7) to form vertical "AH"
    placeTile(board, 6, 6, 'A', 1); // DoubleLetter square
    placeTile(board, 6, 7, 'T', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // Vertical word: A(1*2=2) + T(1) = 3
    // Horizontal word: T(1) + H(4) + I(1) = 6 (H and I are locked, no bonuses)
    expect(result.score).toBe(3 + 6);
  });

  it('applies TripleLetter multiplier', () => {
    const board = new Board();
    // (5,5) is TripleLetter.
    // First place a word touching that area.
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 6, 7, 'B', 3, true);
    placeTile(board, 5, 7, 'C', 3, true);

    // Place new tiles to form a word through (5,5)
    placeTile(board, 5, 5, 'X', 8); // TripleLetter
    placeTile(board, 5, 6, 'O', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // Vertical: X(8*3=24) + O(1) + C(3) = 28
    expect(result.words!.find(w => w.word.includes('X'))!.score).toBe(28);
  });

  it('applies TripleWord multiplier', () => {
    const board = new Board();
    // Place locked tiles to reach the corner area
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 7, 6, 'B', 3, true);
    placeTile(board, 7, 5, 'C', 3, true);
    placeTile(board, 7, 4, 'D', 2, true);
    placeTile(board, 7, 3, 'E', 1, true);
    placeTile(board, 7, 2, 'F', 4, true);
    placeTile(board, 7, 1, 'G', 2, true);

    // Place new tile at (7,0) which is TripleWord
    placeTile(board, 7, 0, 'H', 4);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // H(4) + G(2) + F(4) + E(1) + D(2) + C(3) + B(3) + A(1) = 20, tripled = 60
    expect(result.words![0].score).toBe(60);
  });

  it('awards 50-point bonus for placing all 7 tiles', () => {
    const board = new Board();
    // Place 7 tiles horizontally through center
    placeTile(board, 4, 7, 'S', 1);
    placeTile(board, 5, 7, 'C', 3);
    placeTile(board, 6, 7, 'R', 1);
    placeTile(board, 7, 7, 'A', 1); // DoubleWord
    placeTile(board, 8, 7, 'B', 3);
    placeTile(board, 9, 7, 'L', 1);
    placeTile(board, 10, 7, 'E', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    expect(result.allTilesBonus).toBe(true);
    // S(1)+C(3)+R(1)+A(1)+B(3)+L(1)+E(1) = 11, *2 = 22, +50 bonus = 72
    expect(result.score).toBe(72);
  });

  it('detects unconnected placement', () => {
    const board = new Board();
    // Lock existing tiles so there's a "previous move"
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 8, 7, 'B', 3, true);
    // Place connected new tile touching locked tiles
    placeTile(board, 9, 7, 'C', 3);
    // Place an unconnected new tile below (not adjacent to main word line)
    placeTile(board, 12, 12, 'D', 2);

    const result = calculateMove(board.squares);
    expect(result.error).toBe('unconnected placement');
  });

  it('requires touching old tiles for subsequent moves', () => {
    const board = new Board();
    // Lock existing tiles at center
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 8, 7, 'B', 3, true);

    // Place new tiles far away
    placeTile(board, 0, 0, 'C', 3);
    placeTile(board, 1, 0, 'D', 2);

    const result = calculateMove(board.squares);
    expect(result.error).toContain('not touching old tile');
  });

  it('scores cross words correctly', () => {
    const board = new Board();
    // Place "HI" horizontally at center (locked)
    placeTile(board, 7, 7, 'H', 4, true);
    placeTile(board, 8, 7, 'I', 1, true);

    // Place "AT" vertically at x=8, crossing "I" at (8,7)
    placeTile(board, 8, 6, 'A', 1);
    // (8,7) already has locked "I"
    placeTile(board, 8, 8, 'T', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // Vertical word "AIT": A(1*2 DoubleLetter) + I(1, locked) + T(1*2 DoubleLetter) = 5
    expect(result.words).toHaveLength(1);
    expect(result.words![0].word).toBe('AIT');
    expect(result.words![0].score).toBe(5);
    expect(result.score).toBe(5);
  });

  it('scores multiple cross words', () => {
    const board = new Board();
    // Place "CAT" horizontally at center (locked)
    placeTile(board, 6, 7, 'C', 3, true);
    placeTile(board, 7, 7, 'A', 1, true);
    placeTile(board, 8, 7, 'T', 1, true);

    // Place "ON" vertically: O at (6,6), N at (6,8)
    // This crosses C to make "OC" vertically and also forms "NC"
    placeTile(board, 6, 6, 'O', 1); // DoubleLetter square
    placeTile(board, 6, 8, 'N', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // Vertical word "OCN": O(1*2 DoubleLetter) + C(3, locked) + N(1) = 2+3+1 = 6
    expect(result.words!.find(w => w.word === 'OCN')).toBeDefined();
  });

  it('handles blank tiles (0 score)', () => {
    const board = new Board();
    // Place word with a blank tile
    placeTile(board, 7, 7, 'A', 0); // blank used as 'A'
    placeTile(board, 8, 7, 'T', 1);

    const result = calculateMove(board.squares);
    expect(result.error).toBeUndefined();
    // A(0) + T(1) = 1, doubled = 2
    expect(result.score).toBe(2);
    expect(result.tilesPlaced!.find(t => t.letter === 'A')!.blank).toBe(true);
    expect(result.tilesPlaced!.find(t => t.letter === 'A')!.score).toBe(0);
  });
});
