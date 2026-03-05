import { Router, type Request, type Response } from 'express';
import { getPlayerStats, getHeadToHead, getAllPlayerStats } from './stats-service.js';

const router = Router();

const param = (val: string | string[] | undefined): string => {
  return Array.isArray(val) ? val[0] : val || '';
};

// GET /api/stats - list all players' stats
router.get('/', async (_req: Request, res: Response) => {
  const stats = await getAllPlayerStats();
  res.json(stats);
});

// GET /api/stats/player/:name
router.get('/player/:name', async (req: Request, res: Response) => {
  const name = decodeURIComponent(param(req.params.name));
  const stats = await getPlayerStats(name);
  if (!stats) {
    res.json({
      name,
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      highestScore: 0,
      highestWordScore: 0,
      highestWord: null,
      averageScore: 0,
      totalTilesPlaced: 0,
      bingoCount: 0,
    });
    return;
  }
  res.json(stats);
});

// GET /api/stats/head-to-head/:name1/:name2
router.get('/head-to-head/:name1/:name2', async (req: Request, res: Response) => {
  const name1 = decodeURIComponent(param(req.params.name1));
  const name2 = decodeURIComponent(param(req.params.name2));
  const h2h = await getHeadToHead(name1, name2);
  res.json(h2h);
});

export { router as statsRoutes };
