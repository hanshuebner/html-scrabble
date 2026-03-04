import { Square } from './square.js';

export class Rack {
  squares: Square[];

  constructor(size: number) {
    this.squares = [];

    for (let x = 0; x < size; x++) {
      const square = new Square('Normal');
      square.x = x;
      square.y = -1;
      this.squares[x] = square;
    }
  }

  emptyTiles(): void {
    for (const square of this.squares) {
      square.placeTile(null);
    }
  }

  letters(): string[] {
    return this.squares.reduce<string[]>((accu, square) => {
      if (square.tile) {
        accu.push(square.tile.letter);
      }
      return accu;
    }, []);
  }

  findLetterSquare(letter: string, includingBlank?: boolean): Square | null {
    let blankSquare: Square | null = null;

    const found = this.squares.find((square) => {
      if (square.tile) {
        if (square.tile.isBlank() && !blankSquare) {
          blankSquare = square;
        } else if (square.tile.letter === letter) {
          return true;
        }
      }
      return false;
    });

    if (found) {
      return found;
    } else if (includingBlank) {
      return blankSquare;
    }
    return null;
  }

  toString(): string {
    return `Rack ${this.squares.length}`;
  }
}
