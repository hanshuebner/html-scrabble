import type { Square } from './square.js';
import type { MoveResult, WordScore } from './types.js';

function makeBoardArray(): boolean[][] {
  const arr: boolean[][] = new Array(15);
  for (let x = 0; x < 15; x++) {
    arr[x] = new Array(15).fill(false);
  }
  return arr;
}

export function calculateMove(squares: Square[][]): MoveResult {
  // Check that the start field is occupied
  if (!squares[7][7].tile) {
    return { error: 'start field must be used' };
  }

  // Find top-leftmost placed tile
  let topLeftX = -1;
  let topLeftY = -1;
  let foundTile = false;

  for (let y = 0; !foundTile && y < 15; y++) {
    for (let x = 0; !foundTile && x < 15; x++) {
      if (squares[x][y].tile && !squares[x][y].tileLocked) {
        foundTile = true;
        topLeftX = x;
        topLeftY = y;
      }
    }
  }

  if (!foundTile) {
    return { error: 'no new tile found' };
  }

  // Remember which newly placed tile positions are legal
  const legalPlacements = makeBoardArray();
  legalPlacements[topLeftX][topLeftY] = true;

  function touchingOld(x: number, y: number): boolean {
    return (
      (x > 0 && !!squares[x - 1][y].tile && squares[x - 1][y].tileLocked) ||
      (x < 14 && !!squares[x + 1][y].tile && squares[x + 1][y].tileLocked) ||
      (y > 0 && !!squares[x][y - 1].tile && squares[x][y - 1].tileLocked) ||
      (y < 14 && !!squares[x][y + 1].tile && squares[x][y + 1].tileLocked)
    );
  }

  let isTouchingOld = touchingOld(topLeftX, topLeftY);
  let horizontal = false;

  for (let x = topLeftX + 1; x < 15; x++) {
    if (!squares[x][topLeftY].tile) {
      break;
    } else if (!squares[x][topLeftY].tileLocked) {
      legalPlacements[x][topLeftY] = true;
      horizontal = true;
      isTouchingOld = isTouchingOld || touchingOld(x, topLeftY);
    }
  }

  if (!horizontal) {
    for (let y = topLeftY + 1; y < 15; y++) {
      if (!squares[topLeftX][y].tile) {
        break;
      } else if (!squares[topLeftX][y].tileLocked) {
        legalPlacements[topLeftX][y] = true;
        isTouchingOld = isTouchingOld || touchingOld(topLeftX, y);
      }
    }
  }

  if (!isTouchingOld && !legalPlacements[7][7]) {
    return { error: `not touching old tile ${topLeftX}/${topLeftY}` };
  }

  // Check whether there are any unconnected other placements, count total tiles on board
  let totalTiles = 0;
  for (let x = 0; x < 15; x++) {
    for (let y = 0; y < 15; y++) {
      const square = squares[x][y];
      if (square.tile) {
        totalTiles++;
        if (!square.tileLocked && !legalPlacements[x][y]) {
          return { error: 'unconnected placement' };
        }
      }
    }
  }

  if (totalTiles === 1) {
    return { error: 'first word must consist of at least two letters' };
  }

  const words: WordScore[] = [];

  // The move was legal, calculate scores
  function horizontalWordScores(sq: Square[][]): number {
    let score = 0;
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 14; x++) {
        if (sq[x][y].tile && sq[x + 1][y].tile) {
          let wordScore = 0;
          let letters = '';
          let wordMultiplier = 1;
          let isNewWord = false;
          for (; x < 15 && sq[x][y].tile; x++) {
            const square = sq[x][y];
            let letterScore = square.tile!.score;
            isNewWord = isNewWord || !square.tileLocked;
            if (!square.tileLocked) {
              switch (square.type) {
                case 'DoubleLetter':
                  letterScore *= 2;
                  break;
                case 'TripleLetter':
                  letterScore *= 3;
                  break;
                case 'DoubleWord':
                  wordMultiplier *= 2;
                  break;
                case 'TripleWord':
                  wordMultiplier *= 3;
                  break;
              }
            }
            wordScore += letterScore;
            letters += square.tile!.letter;
          }
          wordScore *= wordMultiplier;
          if (isNewWord) {
            words.push({ word: letters, score: wordScore });
            score += wordScore;
          }
        }
      }
    }
    return score;
  }

  let moveScore = horizontalWordScores(squares);

  // Create rotated version of the board to calculate vertical word scores
  const rotatedSquares: Square[][] = new Array(15);
  for (let x = 0; x < 15; x++) {
    rotatedSquares[x] = new Array(15);
    for (let y = 0; y < 15; y++) {
      rotatedSquares[x][y] = squares[y][x];
    }
  }
  moveScore += horizontalWordScores(rotatedSquares);

  // Collect and count tiles placed
  const tilesPlaced = [];
  for (let x = 0; x < 15; x++) {
    for (let y = 0; y < 15; y++) {
      const square = squares[x][y];
      if (square.tile && !square.tileLocked) {
        tilesPlaced.push({
          letter: square.tile.letter,
          x,
          y,
          blank: square.tile.isBlank(),
        });
      }
    }
  }

  let allTilesBonus = false;
  if (tilesPlaced.length === 7) {
    moveScore += 50;
    allTilesBonus = true;
  }

  return {
    score: moveScore,
    words,
    tilesPlaced,
    allTilesBonus,
  };
}
