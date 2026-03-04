import { describe, it, expect } from 'vitest';
import { LetterBag } from '../src/letter-bag.js';

describe('LetterBag', () => {
  it('creates English bag with 100 tiles', () => {
    const bag = LetterBag.create('English');
    expect(bag.remainingTileCount()).toBe(100);
  });

  it('creates German bag with 102 tiles', () => {
    const bag = LetterBag.create('German');
    expect(bag.remainingTileCount()).toBe(102);
  });

  it('creates French bag with 102 tiles', () => {
    const bag = LetterBag.create('French');
    expect(bag.remainingTileCount()).toBe(102);
  });

  it('creates Hungarian bag with correct tile count', () => {
    const bag = LetterBag.create('Hungarian');
    // Sum of all counts in Hungarian distribution
    expect(bag.remainingTileCount()).toBe(101);
  });

  it('creates Nederlands bag with correct tile count', () => {
    const bag = LetterBag.create('Nederlands');
    expect(bag.remainingTileCount()).toBe(103);
  });

  it('creates Czech bag with correct tile count', () => {
    const bag = LetterBag.create('Czech');
    expect(bag.remainingTileCount()).toBe(100);
  });

  it('creates Estonian bag with correct tile count', () => {
    const bag = LetterBag.create('Estonian');
    expect(bag.remainingTileCount()).toBe(102);
  });

  it('creates Portuguese bag with correct tile count', () => {
    const bag = LetterBag.create('Portuguese');
    expect(bag.remainingTileCount()).toBe(120);
  });

  it('creates Slovenian bag with correct tile count', () => {
    const bag = LetterBag.create('Slovenian');
    expect(bag.remainingTileCount()).toBe(98);
  });

  it('throws for unsupported language', () => {
    expect(() => LetterBag.create('Klingon' as any)).toThrow('unsupported language');
  });

  it('getRandomTile returns a tile and decrements count', () => {
    const bag = LetterBag.create('English');
    const tile = bag.getRandomTile();
    expect(tile).toBeDefined();
    expect(bag.remainingTileCount()).toBe(99);
  });

  it('getRandomTiles returns requested number of tiles', () => {
    const bag = LetterBag.create('English');
    const tiles = bag.getRandomTiles(7);
    expect(tiles.length).toBe(7);
    expect(bag.remainingTileCount()).toBe(93);
  });

  it('returnTile adds tile back', () => {
    const bag = LetterBag.create('English');
    const tile = bag.getRandomTile()!;
    expect(bag.remainingTileCount()).toBe(99);
    bag.returnTile(tile);
    expect(bag.remainingTileCount()).toBe(100);
  });

  it('contains blank tiles', () => {
    const bag = LetterBag.create('English');
    const blanks = bag.tiles.filter((t) => t.isBlank());
    expect(blanks.length).toBe(2);
  });

  it('has correct legal letters for English', () => {
    const bag = LetterBag.create('English');
    expect(bag.legalLetters).toContain('E');
    expect(bag.legalLetters).toContain('Z');
    expect(bag.legalLetters).not.toContain(' ');
  });

  it('getRandomTiles returns fewer tiles when bag is nearly empty', () => {
    const bag = LetterBag.create('Test');
    const total = bag.remainingTileCount();
    bag.getRandomTiles(total - 2); // leave 2
    const remaining = bag.getRandomTiles(5); // ask for 5 but only 2 left
    expect(remaining.length).toBe(2);
    expect(bag.remainingTileCount()).toBe(0);
  });
});
