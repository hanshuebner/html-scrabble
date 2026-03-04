// In-memory stats store — keyed by normalized player name (lowercase)

interface PlayerStatsData {
  name: string; // display name (first seen casing)
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  highestScore: number;
  highestWordScore: number;
  highestWord: string | null;
  averageScore: number;
  totalTilesPlaced: number;
  bingoCount: number;
}

interface HeadToHeadData {
  wins: number;
  losses: number;
  draws: number;
}

const statsCache = new Map<string, PlayerStatsData>(); // key: normalized name
const h2hCache = new Map<string, HeadToHeadData>(); // key: `name1:name2`

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getOrCreateStats(name: string): PlayerStatsData {
  const key = normalizeName(name);
  let stats = statsCache.get(key);
  if (!stats) {
    stats = {
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
    };
    statsCache.set(key, stats);
  }
  return stats;
}

function getOrCreateH2H(name1: string, name2: string): HeadToHeadData {
  const key = `${normalizeName(name1)}:${normalizeName(name2)}`;
  let h2h = h2hCache.get(key);
  if (!h2h) {
    h2h = { wins: 0, losses: 0, draws: 0 };
    h2hCache.set(key, h2h);
  }
  return h2h;
}

export interface GameResult {
  players: {
    name: string;
    score: number;
    tilesPlaced: number;
    highestWord: string | null;
    highestWordScore: number;
    bingoCount: number;
  }[];
}

export function updateStatsForGame(result: GameResult): void {
  const maxScore = Math.max(...result.players.map((p) => p.score));
  const winners = result.players.filter((p) => p.score === maxScore);
  const isDraw = winners.length > 1;

  for (const player of result.players) {
    const stats = getOrCreateStats(player.name);
    stats.gamesPlayed++;
    stats.totalScore += player.score;
    stats.totalTilesPlaced += player.tilesPlaced;
    stats.bingoCount += player.bingoCount;

    if (player.score > stats.highestScore) {
      stats.highestScore = player.score;
    }
    if (player.highestWordScore > stats.highestWordScore) {
      stats.highestWordScore = player.highestWordScore;
      stats.highestWord = player.highestWord;
    }
    if (stats.gamesPlayed > 0) {
      stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed);
    }

    const isWinner = player.score === maxScore;
    if (isWinner && !isDraw) {
      stats.gamesWon++;
    }

    // Head-to-head
    for (const opponent of result.players) {
      if (normalizeName(opponent.name) === normalizeName(player.name)) continue;

      const h2h = getOrCreateH2H(player.name, opponent.name);
      if (isDraw && isWinner && opponent.score === maxScore) {
        h2h.draws++;
      } else if (player.score > opponent.score) {
        h2h.wins++;
      } else if (player.score < opponent.score) {
        h2h.losses++;
      } else {
        h2h.draws++;
      }
    }
  }
}

/**
 * Compute stats from an imported game's data (no Game object needed).
 * Call this for each finished imported game.
 */
export function computeStatsFromImportedGame(game: {
  endMessage: any;
  players: { name: string; score: number }[];
  turns: { playerIndex: number; type: string; score: number; moveData?: any }[];
}): void {
  if (!game.endMessage) return; // only finished games

  // Count tiles placed and find highest word per player
  const playerTiles: number[] = game.players.map(() => 0);
  const playerHighWord: { word: string; score: number }[] = game.players.map(() => ({
    word: '',
    score: 0,
  }));
  const playerBingos: number[] = game.players.map(() => 0);

  for (const turn of game.turns) {
    const pi = turn.playerIndex;
    if (pi < 0 || pi >= game.players.length) continue;

    if (turn.type === 'move' && turn.moveData) {
      // Count placements
      const placements = turn.moveData.placements || [];
      playerTiles[pi] += placements.length;

      // Check for bingo (7 tiles placed)
      if (placements.length >= 7) {
        playerBingos[pi]++;
      }

      // Track highest word
      const words = turn.moveData.words || [];
      for (const w of words) {
        if (w.score > playerHighWord[pi].score) {
          playerHighWord[pi] = { word: w.word, score: w.score };
        }
      }
    }
  }

  // Use final scores from endMessage if available, fall back to player scores
  const finalPlayers = game.endMessage.players || game.players;

  updateStatsForGame({
    players: game.players.map((p, i) => ({
      name: p.name,
      score: finalPlayers[i]?.score ?? p.score,
      tilesPlaced: playerTiles[i] || 0,
      highestWord: playerHighWord[i]?.word || null,
      highestWordScore: playerHighWord[i]?.score || 0,
      bingoCount: playerBingos[i] || 0,
    })),
  });
}

export function getPlayerStats(name: string): PlayerStatsData | null {
  return statsCache.get(normalizeName(name)) || null;
}

export function getHeadToHead(name1: string, name2: string): HeadToHeadData {
  return getOrCreateH2H(name1, name2);
}

export function getAllPlayerStats(): PlayerStatsData[] {
  return Array.from(statsCache.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}
