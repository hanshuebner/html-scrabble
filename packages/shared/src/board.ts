import { Square } from './square.js'

const DIMENSION = 15

const makeBoardArray = (): Square[][] => {
  const arr: Square[][] = new Array(DIMENSION)
  for (let x = 0; x < DIMENSION; x++) {
    arr[x] = new Array(DIMENSION)
  }
  return arr
}

export { makeBoardArray }

export class Board {
  static readonly Dimension = DIMENSION
  squares: Square[][]

  constructor() {
    this.squares = makeBoardArray()

    const dim = DIMENSION
    const middle = Math.floor(dim / 2)
    const halfMiddle = Math.ceil(middle / 2)

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        let square: Square

        if (
          (x === 0 || x === dim - 1 || x === middle) &&
          (y === 0 || y === dim - 1 || (y === middle && x !== middle))
        ) {
          square = new Square('TripleWord')
        } else if (
          (x === middle && y === middle) ||
          (x > 0 && x < middle - 2 && (y === x || y === dim - x - 1)) ||
          (x > middle + 2 && x < dim - 1 && (x === y || x === dim - y - 1))
        ) {
          square = new Square('DoubleWord')
        } else if (
          ((x === middle - 1 || x === middle + 1) && (y === middle - 1 || y === middle + 1)) ||
          ((x === 0 || x === dim - 1 || x === middle) && (y === middle + halfMiddle || y === middle - halfMiddle)) ||
          ((y === 0 || y === dim - 1 || y === middle) && (x === middle + halfMiddle || x === middle - halfMiddle)) ||
          ((y === middle + 1 || y === middle - 1) &&
            (x === middle + halfMiddle + 1 || x === middle - halfMiddle - 1)) ||
          ((x === middle + 1 || x === middle - 1) && (y === middle + halfMiddle + 1 || y === middle - halfMiddle - 1))
        ) {
          square = new Square('DoubleLetter')
        } else if (
          ((x === middle - 2 || x === middle + 2) && (y === middle - 2 || y === middle + 2)) ||
          ((y === middle + 2 || y === middle - 2) &&
            (x === middle + halfMiddle + 2 || x === middle - halfMiddle - 2)) ||
          ((x === middle + 2 || x === middle - 2) && (y === middle + halfMiddle + 2 || y === middle - halfMiddle - 2))
        ) {
          square = new Square('TripleLetter')
        } else {
          square = new Square('Normal')
        }

        square.x = x
        square.y = y
        this.squares[x][y] = square
      }
    }
  }

  forAllSquares(f: (square: Square) => void): void {
    for (let y = 0; y < DIMENSION; y++) {
      for (let x = 0; x < DIMENSION; x++) {
        f(this.squares[x][y])
      }
    }
  }

  emptyTiles(): void {
    this.forAllSquares((square) => {
      square.placeTile(null)
    })
  }

  toString(): string {
    return `Board ${DIMENSION} x ${DIMENSION}`
  }
}
