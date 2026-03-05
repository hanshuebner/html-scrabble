export class Tile {
  letter: string
  score: number

  constructor(letter: string, score: number) {
    this.letter = letter
    this.score = score
  }

  isBlank(): boolean {
    return this.score === 0
  }

  toString(): string {
    return `Tile: [${this.isBlank() ? 'blank' : this.letter}] --> ${this.score}`
  }
}
