import { describe, it, expect } from 'vitest';
import { Tile } from '../src/tile.js';

describe('Tile', () => {
  it('stores letter and score', () => {
    const tile = new Tile('A', 1);
    expect(tile.letter).toBe('A');
    expect(tile.score).toBe(1);
  });

  it('identifies blank tiles', () => {
    const blank = new Tile(' ', 0);
    expect(blank.isBlank()).toBe(true);

    const regular = new Tile('A', 1);
    expect(regular.isBlank()).toBe(false);
  });

  it('formats toString correctly', () => {
    const tile = new Tile('A', 1);
    expect(tile.toString()).toBe('Tile: [A] --> 1');

    const blank = new Tile(' ', 0);
    expect(blank.toString()).toBe('Tile: [blank] --> 0');
  });
});
