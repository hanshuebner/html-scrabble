import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame,
  loadGame,
  lookupPlayer,
  makeMove,
  pass,
  swapTiles,
  challengeOrTakeBackMove,
  finishTurn,
  createFollowonGame,
  getGameState,
  remainingTileCounts,
  setNotifyFn,
} from '../src/game/game-service.js';
import type { Game, Player } from '../src/game/game-service.js';
import type { TilePlacement } from '@scrabble/shared';

// Suppress notifications during tests
setNotifyFn(() => {});

async function setupTwoPlayerGame(): Promise<Game> {
  return createGame('English', [
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
  ]);
}

function getPlayerRackLetters(player: Player): string[] {
  return player.rack.squares
    .filter((sq) => sq.tile)
    .map((sq) => sq.tile!.letter);
}

describe('Game Service', () => {
  describe('createGame', () => {
    it('creates a game with two players', async () => {
      const game = await setupTwoPlayerGame();
      expect(game.key).toBeTruthy();
      expect(game.players).toHaveLength(2);
      expect(game.players[0].name).toBe('Alice');
      expect(game.players[1].name).toBe('Bob');
      expect(game.whosTurn).toBe(0);
      expect(game.passes).toBe(0);
    });

    it('each player gets 7 tiles', async () => {
      const game = await setupTwoPlayerGame();
      for (const player of game.players) {
        const tiles = getPlayerRackLetters(player);
        expect(tiles.length).toBe(7);
      }
    });

    it('letter bag has correct remaining count', async () => {
      const game = await setupTwoPlayerGame();
      // English = 100 tiles, minus 14 dealt = 86
      expect(game.letterBag.remainingTileCount()).toBe(86);
    });

    it('supports multiple languages', async () => {
      const game = await createGame('German', [
        { name: 'A', email: 'a@t.com' },
        { name: 'B', email: 'b@t.com' },
      ]);
      expect(game.language).toBe('German');
    });

    it('supports 3-4 players', async () => {
      const game = await createGame('English', [
        { name: 'A', email: 'a@t.com' },
        { name: 'B', email: 'b@t.com' },
        { name: 'C', email: 'c@t.com' },
        { name: 'D', email: 'd@t.com' },
      ]);
      expect(game.players).toHaveLength(4);
      // 100 - 28 = 72
      expect(game.letterBag.remainingTileCount()).toBe(72);
    });
  });

  describe('loadGame', () => {
    it('loads a created game by key', async () => {
      const game = await setupTwoPlayerGame();
      const loaded = await loadGame(game.key);
      expect(loaded).not.toBeNull();
      expect(loaded!.key).toBe(game.key);
      expect(loaded!.players).toHaveLength(game.players.length);
      expect(loaded!.players[0].name).toBe(game.players[0].name);
    });

    it('returns null for unknown key', async () => {
      const loaded = await loadGame('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('lookupPlayer', () => {
    it('finds player by key', async () => {
      const game = await setupTwoPlayerGame();
      const found = lookupPlayer(game, game.players[0].key);
      expect(found).toBe(game.players[0]);
    });

    it('returns null for unknown key', async () => {
      const game = await setupTwoPlayerGame();
      expect(lookupPlayer(game, 'badkey')).toBeNull();
    });
  });

  describe('makeMove', () => {
    it('places tiles and scores', async () => {
      const game = await setupTwoPlayerGame();
      const player = game.players[0];
      const letters = getPlayerRackLetters(player);

      // Place first two letters horizontally through center
      const placements: TilePlacement[] = [
        { letter: letters[0], x: 7, y: 7, blank: false },
        { letter: letters[1], x: 8, y: 7, blank: false },
      ];

      const result = makeMove(game, player, placements);
      expect(result.turn.type).toBe('move');
      expect(result.turn.score).toBeGreaterThan(0);
      expect(result.newTiles.length).toBeLessThanOrEqual(2);
    });

    it('rejects move when not player turn', async () => {
      const game = await setupTwoPlayerGame();
      const bob = game.players[1]; // It's Alice's turn (index 0)
      const letters = getPlayerRackLetters(bob);

      expect(() =>
        makeMove(game, bob, [
          { letter: letters[0], x: 7, y: 7, blank: false },
          { letter: letters[1], x: 8, y: 7, blank: false },
        ]),
      ).toThrow("not this player's turn");
    });

    it('rejects move with letter not in rack', async () => {
      const game = await setupTwoPlayerGame();
      const player = game.players[0];

      expect(() =>
        makeMove(game, player, [
          { letter: '@', x: 7, y: 7, blank: false },
          { letter: '#', x: 8, y: 7, blank: false },
        ]),
      ).toThrow('cannot find letter');
    });
  });

  describe('pass', () => {
    it('increments pass counter', async () => {
      const game = await setupTwoPlayerGame();
      const player = game.players[0];
      const result = pass(game, player);

      expect(result.turn.type).toBe('pass');
      expect(result.turn.score).toBe(0);
      expect(game.passes).toBe(1);
    });
  });

  describe('swapTiles', () => {
    it('swaps tiles and increments passes', async () => {
      const game = await setupTwoPlayerGame();
      const player = game.players[0];
      const lettersToSwap = getPlayerRackLetters(player).slice(0, 2);

      const result = swapTiles(game, player, lettersToSwap);
      expect(result.turn.type).toBe('swap');
      expect(result.turn.count).toBe(2);
      expect(result.newTiles).toHaveLength(2);
      expect(game.passes).toBe(1);
    });

    it('rejects swap when bag has fewer than 7 tiles', async () => {
      const game = await setupTwoPlayerGame();
      // Drain the bag
      game.letterBag.getRandomTiles(game.letterBag.remainingTileCount());

      const player = game.players[0];
      const letters = getPlayerRackLetters(player).slice(0, 1);

      expect(() => swapTiles(game, player, letters)).toThrow('cannot swap');
    });
  });

  describe('finishTurn', () => {
    it('advances turn to next player', async () => {
      const game = await setupTwoPlayerGame();
      const player = game.players[0];
      const result = pass(game, player);

      await finishTurn(game, player, result.newTiles, result.turn);
      expect(game.whosTurn).toBe(1);
    });

    it('wraps turn around', async () => {
      const game = await setupTwoPlayerGame();

      // Player 0 passes
      const r0 = pass(game, game.players[0]);
      await finishTurn(game, game.players[0], r0.newTiles, r0.turn);
      expect(game.whosTurn).toBe(1);

      // Player 1 passes
      const r1 = pass(game, game.players[1]);
      await finishTurn(game, game.players[1], r1.newTiles, r1.turn);
      expect(game.whosTurn).toBe(0);
    });

    it('ends game after all players pass twice', async () => {
      const game = await setupTwoPlayerGame();

      // 4 passes needed (2 players * 2)
      for (let i = 0; i < 4; i++) {
        const player = game.players[game.whosTurn!];
        const r = pass(game, player);
        await finishTurn(game, player, r.newTiles, r.turn);
      }

      expect(game.endMessage).not.toBeNull();
      expect(game.endMessage!.reason).toContain('passed two times');
      expect(game.whosTurn).toBeUndefined();
    });
  });

  describe('challengeOrTakeBackMove', () => {
    it('reverses a previous move on challenge', async () => {
      const game = await setupTwoPlayerGame();
      const alice = game.players[0];
      const letters = getPlayerRackLetters(alice);
      const initialScore = alice.score;

      // Alice makes a move
      const moveResult = makeMove(game, alice, [
        { letter: letters[0], x: 7, y: 7, blank: false },
        { letter: letters[1], x: 8, y: 7, blank: false },
      ]);
      await finishTurn(game, alice, moveResult.newTiles, moveResult.turn);

      const scoreAfterMove = alice.score;
      expect(scoreAfterMove).toBeGreaterThan(initialScore);

      // Bob challenges
      const bob = game.players[1];
      const challengeResult = challengeOrTakeBackMove(game, 'challenge', bob);
      await finishTurn(game, bob, challengeResult.newTiles, challengeResult.turn);

      // Score should be reversed
      expect(alice.score).toBe(initialScore);
      // Board should be cleared
      expect(game.board.squares[7][7].tile).toBeNull();
      expect(game.board.squares[8][7].tile).toBeNull();
    });

    it('throws when no previous move', async () => {
      const game = await setupTwoPlayerGame();
      const bob = game.players[1];
      expect(() => challengeOrTakeBackMove(game, 'challenge', bob)).toThrow(
        'no previous move',
      );
    });
  });

  describe('getGameState', () => {
    it('returns board and player info', async () => {
      const game = await setupTwoPlayerGame();
      const state = getGameState(game, game.players[0].key);

      expect(state.key).toBe(game.key);
      expect(state.language).toBe('English');
      expect(state.whosTurn).toBe(0);
      expect(state.players).toHaveLength(2);
      // Player 0 (us) should have rack visible
      expect(state.players[0].rack).not.toBeNull();
      // Player 1 rack should be hidden
      expect(state.players[1].rack).toBeNull();
    });
  });

  describe('createFollowonGame', () => {
    it('creates a new game after the old one ends', async () => {
      const game = await setupTwoPlayerGame();
      // End the game by passing enough times
      for (let i = 0; i < 4; i++) {
        const player = game.players[game.whosTurn!];
        const r = pass(game, player);
        await finishTurn(game, player, r.newTiles, r.turn);
      }

      expect(game.endMessage).not.toBeNull();

      const newGame = await createFollowonGame(game, game.players[0]);
      expect(newGame.key).not.toBe(game.key);
      expect(newGame.players).toHaveLength(2);
      expect(game.nextGameKey).toBe(newGame.key);
      expect(game.endMessage!.nextGameKey).toBe(newGame.key);
    });

    it('throws if followon already created', async () => {
      const game = await setupTwoPlayerGame();
      for (let i = 0; i < 4; i++) {
        const player = game.players[game.whosTurn!];
        const r = pass(game, player);
        await finishTurn(game, player, r.newTiles, r.turn);
      }

      await createFollowonGame(game, game.players[0]);
      await expect(
        createFollowonGame(game, game.players[0]),
      ).rejects.toThrow('followon game already created');
    });
  });

  describe('remainingTileCounts', () => {
    it('reports correct counts', async () => {
      const game = await setupTwoPlayerGame();
      const counts = remainingTileCounts(game);
      expect(counts.letterBag).toBe(86);
      expect(counts.players).toEqual([7, 7]);
    });
  });
});
