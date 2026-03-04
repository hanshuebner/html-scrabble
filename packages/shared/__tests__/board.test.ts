import { describe, it, expect } from 'vitest';
import { Board } from '../src/board.js';

describe('Board', () => {
  it('creates a 15x15 grid', () => {
    const board = new Board();
    expect(board.squares.length).toBe(15);
    for (let x = 0; x < 15; x++) {
      expect(board.squares[x].length).toBe(15);
    }
  });

  it('sets correct square coordinates', () => {
    const board = new Board();
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        expect(board.squares[x][y].x).toBe(x);
        expect(board.squares[x][y].y).toBe(y);
      }
    }
  });

  it('center square is DoubleWord', () => {
    const board = new Board();
    expect(board.squares[7][7].type).toBe('DoubleWord');
  });

  it('corners are TripleWord', () => {
    const board = new Board();
    expect(board.squares[0][0].type).toBe('TripleWord');
    expect(board.squares[0][14].type).toBe('TripleWord');
    expect(board.squares[14][0].type).toBe('TripleWord');
    expect(board.squares[14][14].type).toBe('TripleWord');
  });

  it('has TripleWord squares at expected positions', () => {
    const board = new Board();
    // Mid-edges
    expect(board.squares[7][0].type).toBe('TripleWord');
    expect(board.squares[0][7].type).toBe('TripleWord');
    expect(board.squares[14][7].type).toBe('TripleWord');
    expect(board.squares[7][14].type).toBe('TripleWord');
  });

  it('has DoubleWord squares on diagonals', () => {
    const board = new Board();
    expect(board.squares[1][1].type).toBe('DoubleWord');
    expect(board.squares[2][2].type).toBe('DoubleWord');
    expect(board.squares[3][3].type).toBe('DoubleWord');
    expect(board.squares[4][4].type).toBe('DoubleWord');
  });

  it('has DoubleLetter squares near center', () => {
    const board = new Board();
    expect(board.squares[6][6].type).toBe('DoubleLetter');
    expect(board.squares[8][6].type).toBe('DoubleLetter');
    expect(board.squares[6][8].type).toBe('DoubleLetter');
    expect(board.squares[8][8].type).toBe('DoubleLetter');
  });

  it('has TripleLetter squares at expected positions', () => {
    const board = new Board();
    expect(board.squares[5][5].type).toBe('TripleLetter');
    expect(board.squares[9][5].type).toBe('TripleLetter');
    expect(board.squares[5][9].type).toBe('TripleLetter');
    expect(board.squares[9][9].type).toBe('TripleLetter');
  });

  it('forAllSquares iterates all 225 squares', () => {
    const board = new Board();
    let count = 0;
    board.forAllSquares(() => count++);
    expect(count).toBe(225);
  });
});
