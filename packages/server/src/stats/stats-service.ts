import { sql } from 'drizzle-orm';
import { db } from '../db/connection.js';

interface PlayerStatsData {
  name: string;
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

export async function getAllPlayerStats(): Promise<PlayerStatsData[]> {
  const rows = await db.execute<{
    name: string;
    games_played: string;
    games_won: string;
    total_score: string;
    highest_score: string;
    average_score: string;
    total_tiles_placed: string;
    bingo_count: string;
    highest_word: string | null;
    highest_word_score: string;
  }>(sql`
    WITH finished_games AS (
      SELECT g.id
      FROM games g
      WHERE g.end_message IS NOT NULL
    ),
    player_games AS (
      SELECT
        lower(trim(gp.name)) AS norm_name,
        min(gp.name) AS display_name,
        gp.game_id,
        gp.score,
        gp.player_index
      FROM game_players gp
      JOIN finished_games fg ON fg.id = gp.game_id
      GROUP BY lower(trim(gp.name)), gp.game_id, gp.score, gp.player_index
    ),
    game_max_scores AS (
      SELECT game_id, max(score) AS max_score, count(*) FILTER (WHERE score = (
        SELECT max(gp2.score) FROM game_players gp2 WHERE gp2.game_id = pg.game_id
      )) AS winners_count
      FROM player_games pg
      GROUP BY game_id
    ),
    turn_stats AS (
      SELECT
        lower(trim(gp.name)) AS norm_name,
        coalesce(sum(jsonb_array_length(t.move_data->'placements')), 0) AS tiles_placed,
        count(*) FILTER (WHERE jsonb_array_length(t.move_data->'placements') >= 7) AS bingos
      FROM turns t
      JOIN game_players gp ON gp.game_id = t.game_id AND gp.player_index = t.player_index
      JOIN finished_games fg ON fg.id = t.game_id
      WHERE t.type = 'move' AND t.move_data IS NOT NULL
      GROUP BY lower(trim(gp.name))
    ),
    word_stats AS (
      SELECT DISTINCT ON (lower(trim(gp.name)))
        lower(trim(gp.name)) AS norm_name,
        w->>'word' AS highest_word,
        (w->>'score')::int AS highest_word_score
      FROM turns t
      JOIN game_players gp ON gp.game_id = t.game_id AND gp.player_index = t.player_index
      JOIN finished_games fg ON fg.id = t.game_id,
      LATERAL jsonb_array_elements(t.move_data->'move'->'words') AS w
      WHERE t.type = 'move' AND t.move_data IS NOT NULL
      ORDER BY lower(trim(gp.name)), (w->>'score')::int DESC
    )
    SELECT
      pg.display_name AS name,
      count(*)::text AS games_played,
      count(*) FILTER (WHERE pg.score = gms.max_score AND gms.winners_count = 1)::text AS games_won,
      sum(pg.score)::text AS total_score,
      max(pg.score)::text AS highest_score,
      round(avg(pg.score))::text AS average_score,
      coalesce(ts.tiles_placed, 0)::text AS total_tiles_placed,
      coalesce(ts.bingos, 0)::text AS bingo_count,
      ws.highest_word,
      coalesce(ws.highest_word_score, 0)::text AS highest_word_score
    FROM player_games pg
    JOIN game_max_scores gms ON gms.game_id = pg.game_id
    LEFT JOIN turn_stats ts ON ts.norm_name = pg.norm_name
    LEFT JOIN word_stats ws ON ws.norm_name = pg.norm_name
    GROUP BY pg.norm_name, pg.display_name, ts.tiles_placed, ts.bingos, ws.highest_word, ws.highest_word_score
    ORDER BY count(*) DESC
  `);

  return rows.map((r) => ({
    name: r.name,
    gamesPlayed: Number(r.games_played),
    gamesWon: Number(r.games_won),
    totalScore: Number(r.total_score),
    highestScore: Number(r.highest_score),
    averageScore: Number(r.average_score),
    totalTilesPlaced: Number(r.total_tiles_placed),
    bingoCount: Number(r.bingo_count),
    highestWord: r.highest_word,
    highestWordScore: Number(r.highest_word_score),
  }));
}

export async function getPlayerStats(name: string): Promise<PlayerStatsData | null> {
  const all = await getAllPlayerStats();
  const norm = name.trim().toLowerCase();
  return all.find((s) => s.name.trim().toLowerCase() === norm) ?? null;
}

export async function getHeadToHead(name1: string, name2: string): Promise<HeadToHeadData> {
  const norm1 = name1.trim().toLowerCase();
  const norm2 = name2.trim().toLowerCase();

  const rows = await db.execute<{
    wins: string;
    losses: string;
    draws: string;
  }>(sql`
    WITH finished_games AS (
      SELECT g.id
      FROM games g
      WHERE g.end_message IS NOT NULL
    ),
    matched_games AS (
      SELECT
        gp1.game_id,
        gp1.score AS score1,
        gp2.score AS score2
      FROM game_players gp1
      JOIN game_players gp2 ON gp1.game_id = gp2.game_id
      JOIN finished_games fg ON fg.id = gp1.game_id
      WHERE lower(trim(gp1.name)) = ${norm1}
        AND lower(trim(gp2.name)) = ${norm2}
    )
    SELECT
      count(*) FILTER (WHERE score1 > score2)::text AS wins,
      count(*) FILTER (WHERE score1 < score2)::text AS losses,
      count(*) FILTER (WHERE score1 = score2)::text AS draws
    FROM matched_games
  `);

  const row = rows[0];
  return {
    wins: Number(row?.wins ?? 0),
    losses: Number(row?.losses ?? 0),
    draws: Number(row?.draws ?? 0),
  };
}
