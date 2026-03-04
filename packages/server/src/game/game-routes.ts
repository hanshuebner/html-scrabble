import { Router } from 'express';
import type { Request, Response } from 'express';
import { computeStatsFromImportedGame } from '../stats/stats-service.js';
import {
  createGame,
  loadGame,
  lookupPlayer,
  makeMove,
  pass,
  swapTiles,
  challengeOrTakeBackMove,
  createFollowonGame,
  finishTurn,
  getGameState,
  listActiveGames,
  importGame,
} from './game-service.js';
import type { Language } from '@scrabble/shared';

export const gameRoutes = Router();

function param(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] : val || '';
}

// List active games
gameRoutes.get('/', async (_req: Request, res: Response) => {
  res.json(await listActiveGames());
});

// Create a new game
gameRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { language, players } = req.body as {
      language?: Language;
      players: { name: string; email: string }[];
    };

    if (!players || players.length < 2) {
      res.status(400).json({ error: 'at least two players must participate' });
      return;
    }

    if (players.length > 4) {
      res.status(400).json({ error: 'at most four players allowed' });
      return;
    }

    const game = await createGame(language || 'English', players);
    res.json({
      key: game.key,
      players: game.players.map((p) => ({
        name: p.name,
        key: p.key,
        index: p.index,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Import games from migration JSON
gameRoutes.post('/import', async (req: Request, res: Response) => {
  try {
    const games = req.body;
    if (!Array.isArray(games)) {
      res.status(400).json({ error: 'Expected a JSON array of games' });
      return;
    }
    let imported = 0;
    const errors: string[] = [];
    for (const data of games) {
      try {
        await importGame(data);
        computeStatsFromImportedGame(data);
        imported++;
      } catch (e: any) {
        errors.push(`${data.key}: ${e.message}`);
      }
    }
    res.json({ imported, errors });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Get game state
gameRoutes.get('/:gameKey', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = (req.query.playerKey as string) || req.cookies?.[game.key];
    if (req.query.playerKey) {
      res.cookie(game.key, req.query.playerKey as string, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
    res.json(getGameState(game, playerKey));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Set player cookie and redirect
gameRoutes.get('/:gameKey/:playerKey', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    res.cookie(game.key, param(req.params.playerKey), {
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`/game/${game.key}`);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Make a move
gameRoutes.post('/:gameKey/move', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    const { placements } = req.body;
    const result = makeMove(game, player, placements);
    await finishTurn(game, player, result.newTiles, result.turn);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Pass
gameRoutes.post('/:gameKey/pass', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    const result = pass(game, player);
    await finishTurn(game, player, result.newTiles, result.turn);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Swap tiles
gameRoutes.post('/:gameKey/swap', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    const { letters } = req.body;
    const result = swapTiles(game, player, letters);
    await finishTurn(game, player, result.newTiles, result.turn);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Challenge previous move
gameRoutes.post('/:gameKey/challenge', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    const result = challengeOrTakeBackMove(game, 'challenge', player);
    await finishTurn(game, player, result.newTiles, result.turn);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Take back previous move
gameRoutes.post('/:gameKey/take-back', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    const result = challengeOrTakeBackMove(game, 'takeBack', player);
    await finishTurn(game, player, result.newTiles, result.turn);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Create follow-on game
gameRoutes.post('/:gameKey/new-game', async (req: Request, res: Response) => {
  try {
    const game = await loadGame(param(req.params.gameKey));
    if (!game) {
      res.status(404).json({ error: 'game not found' });
      return;
    }

    const playerKey = req.body?.playerKey || req.cookies?.[game.key];
    const player = playerKey ? lookupPlayer(game, playerKey) : null;
    if (!player) {
      res.status(403).json({ error: 'invalid player' });
      return;
    }

    if (game.nextGameKey) {
      res.json({ key: game.nextGameKey });
      return;
    }
    const newGame = await createFollowonGame(game, player);
    res.json({ key: newGame.key });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
