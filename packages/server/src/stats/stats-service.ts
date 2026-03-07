import { sql } from 'drizzle-orm'
import { db } from '../db/connection.js'

interface TopMove {
  words: string[]
  score: number
}

interface PlayerStatsData {
  name: string
  gamesPlayed: number
  gamesWon: number
  totalScore: number
  highestScore: number
  topMoves: TopMove[]
  averageScore: number
  totalTilesPlaced: number
  bingoCount: number
}

interface HeadToHeadData {
  wins: number
  losses: number
  draws: number
}

export const getAllPlayerStats = async (): Promise<PlayerStatsData[]> => {
  const rows = await db.execute<{
    name: string
    games_played: string
    games_won: string
    total_score: string
    highest_score: string
    average_score: string
    total_tiles_placed: string
    bingo_count: string
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
    )
    SELECT
      pg.display_name AS name,
      count(*)::text AS games_played,
      count(*) FILTER (WHERE pg.score = gms.max_score AND gms.winners_count = 1)::text AS games_won,
      sum(pg.score)::text AS total_score,
      max(pg.score)::text AS highest_score,
      round(avg(pg.score))::text AS average_score,
      coalesce(ts.tiles_placed, 0)::text AS total_tiles_placed,
      coalesce(ts.bingos, 0)::text AS bingo_count
    FROM player_games pg
    JOIN game_max_scores gms ON gms.game_id = pg.game_id
    LEFT JOIN turn_stats ts ON ts.norm_name = pg.norm_name
    GROUP BY pg.norm_name, pg.display_name, ts.tiles_placed, ts.bingos
    ORDER BY count(*) DESC
  `)

  // Fetch top 5 moves per player
  const topMovesRows = await db.execute<{
    norm_name: string
    words: string
    score: string
  }>(sql`
    SELECT
      sub.norm_name,
      sub.words,
      sub.score::text
    FROM (
      SELECT
        lower(trim(gp.name)) AS norm_name,
        (SELECT string_agg(w->>'word', ', ' ORDER BY (w->>'score')::int DESC)
         FROM jsonb_array_elements(t.move_data->'move'->'words') AS w
        ) AS words,
        t.score,
        row_number() OVER (PARTITION BY lower(trim(gp.name)) ORDER BY t.score DESC) AS rn
      FROM turns t
      JOIN game_players gp ON gp.game_id = t.game_id AND gp.player_index = t.player_index
      JOIN games g ON g.id = t.game_id
      WHERE t.type = 'move'
        AND t.move_data IS NOT NULL
        AND g.end_message IS NOT NULL
    ) sub
    WHERE sub.rn <= 5
    ORDER BY sub.norm_name, sub.score DESC
  `)

  const topMovesMap = new Map<string, TopMove[]>()
  for (const r of topMovesRows) {
    const moves = topMovesMap.get(r.norm_name) ?? []
    moves.push({
      words: r.words ? r.words.split(', ') : [],
      score: Number(r.score),
    })
    topMovesMap.set(r.norm_name, moves)
  }

  return rows.map((r) => ({
    name: r.name,
    gamesPlayed: Number(r.games_played),
    gamesWon: Number(r.games_won),
    totalScore: Number(r.total_score),
    highestScore: Number(r.highest_score),
    averageScore: Number(r.average_score),
    totalTilesPlaced: Number(r.total_tiles_placed),
    bingoCount: Number(r.bingo_count),
    topMoves: topMovesMap.get(r.name.trim().toLowerCase()) ?? [],
  }))
}

export const getPlayerStats = async (name: string): Promise<PlayerStatsData | null> => {
  const all = await getAllPlayerStats()
  const norm = name.trim().toLowerCase()
  return all.find((s) => s.name.trim().toLowerCase() === norm) ?? null
}

export const getHeadToHead = async (name1: string, name2: string): Promise<HeadToHeadData> => {
  const norm1 = name1.trim().toLowerCase()
  const norm2 = name2.trim().toLowerCase()

  const rows = await db.execute<{
    wins: string
    losses: string
    draws: string
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
  `)

  const row = rows[0]
  return {
    wins: Number(row?.wins ?? 0),
    losses: Number(row?.losses ?? 0),
    draws: Number(row?.draws ?? 0),
  }
}
