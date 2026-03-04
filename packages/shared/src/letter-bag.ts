import { Tile } from './tile.js';
import { letterDistributions } from './letter-distributions.js';
import type { Language } from './types.js';

function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class LetterBag {
  tiles: Tile[];
  legalLetters: string;

  private constructor() {
    this.tiles = [];
    this.legalLetters = '';
  }

  static create(language: Language): LetterBag {
    const letterBag = new LetterBag();
    const letterDistribution = letterDistributions[language];

    if (!letterDistribution) {
      throw new Error(`unsupported language: ${language}`);
    }

    for (const letterDefinition of letterDistribution) {
      if (letterDefinition.letter) {
        letterBag.legalLetters += letterDefinition.letter;
      }

      for (let n = 0; n < letterDefinition.count; n++) {
        const tile = new Tile(letterDefinition.letter || ' ', letterDefinition.score);
        letterBag.tiles.push(tile);
      }
    }

    return letterBag;
  }

  shake(): void {
    this.tiles = shuffle(this.tiles);
  }

  getRandomTile(): Tile | undefined {
    this.shake();
    return this.tiles.pop();
  }

  getRandomTiles(count: number): Tile[] {
    this.shake();
    const result: Tile[] = [];
    for (let i = 0; this.tiles.length && i < count; i++) {
      result.push(this.tiles.pop()!);
    }
    return result;
  }

  returnTile(tile: Tile): void {
    this.tiles.push(tile);
  }

  returnTiles(tiles: Tile[]): void {
    this.tiles = this.tiles.concat(tiles);
  }

  remainingTileCount(): number {
    return this.tiles.length;
  }
}
