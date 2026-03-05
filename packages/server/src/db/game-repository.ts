import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from './connection.js';
import { games, gamePlayers, turns } from './schema.js';

// ── Types for DB operations ─────────────────────────────────────────────────

export interface GameInsertData {
  key: string;
  language: string;
  boardState: unknown;
  letterBag: unknown;
  whosTurn: number | undefined;
  passes: number;
  previousMove: unknown;
  endMessage: unknown;
  nextGameKey: string | null;
}

export interface PlayerInsertData {
  playerIndex: number;
  name: string;
  email: string;
  key: string;
  score: number;
  rack: unknown;
  tallyScore: number | undefined;
}

export interface TurnInsertData {
  turnNumber: number;
  playerIndex: number;
  type: string;
  score: number;
  moveData: unknown;
}

// ── Insert game with players in a single transaction ────────────────────────

export const insertGameWithPlayers = async (
  gameData: GameInsertData,
  players: PlayerInsertData[],
): Promise<string> => {
  return await db.transaction(async (tx) => {
    const [gameRow] = await tx
      .insert(games)
      .values({
        key: gameData.key,
        language: gameData.language,
        boardState: gameData.boardState,
        letterBag: gameData.letterBag,
        whosTurn: gameData.whosTurn ?? null,
        passes: gameData.passes,
        previousMove: gameData.previousMove,
        endMessage: gameData.endMessage,
        nextGameKey: gameData.nextGameKey,
      })
      .returning({ id: games.id });

    if (players.length > 0) {
      await tx.insert(gamePlayers).values(
        players.map((p) => ({
          gameId: gameRow.id,
          playerIndex: p.playerIndex,
          name: p.name,
          email: p.email,
          key: p.key,
          score: p.score,
          rack: p.rack,
          tallyScore: p.tallyScore ?? null,
        })),
      );
    }

    return gameRow.id;
  });
};

// ── Persist a turn (update game state + player rows + insert turn) ──────────

export const persistTurn = async (
  gameId: string,
  gameUpdate: {
    boardState: unknown;
    letterBag: unknown;
    whosTurn: number | undefined;
    passes: number;
    previousMove: unknown;
    endMessage: unknown;
  },
  playerUpdates: { playerIndex: number; score: number; rack: unknown; tallyScore: number | undefined }[],
  turnRecord: TurnInsertData,
): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx
      .update(games)
      .set({
        boardState: gameUpdate.boardState,
        letterBag: gameUpdate.letterBag,
        whosTurn: gameUpdate.whosTurn ?? null,
        passes: gameUpdate.passes,
        previousMove: gameUpdate.previousMove,
        endMessage: gameUpdate.endMessage,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId));

    for (const pu of playerUpdates) {
      await tx
        .update(gamePlayers)
        .set({
          score: pu.score,
          rack: pu.rack,
          tallyScore: pu.tallyScore ?? null,
        })
        .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.playerIndex, pu.playerIndex)));
    }

    await tx.insert(turns).values({
      gameId,
      turnNumber: turnRecord.turnNumber,
      playerIndex: turnRecord.playerIndex,
      type: turnRecord.type,
      score: turnRecord.score,
      moveData: turnRecord.moveData,
    });
  });
};

// ── Update game state (e.g. nextGameKey) ────────────────────────────────────

export const updateGameState = async (
  gameId: string,
  data: Partial<{
    nextGameKey: string | null;
    endMessage: unknown;
  }>,
): Promise<void> => {
  await db
    .update(games)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(games.id, gameId));
};

// ── Find game by key (with players and turns) ───────────────────────────────

export interface GameDbRow {
  id: string;
  key: string;
  language: string;
  boardState: unknown;
  letterBag: unknown;
  whosTurn: number | null;
  passes: number;
  previousMove: unknown;
  endMessage: unknown;
  nextGameKey: string | null;
  createdAt: Date;
}

export interface PlayerDbRow {
  playerIndex: number;
  name: string;
  email: string;
  key: string;
  score: number;
  rack: unknown;
  tallyScore: number | null;
}

export interface TurnDbRow {
  turnNumber: number;
  playerIndex: number;
  type: string;
  score: number;
  moveData: unknown;
  timestamp: Date;
}

export const findActiveGames = async (): Promise<
  { key: string; language: string; whosTurn: number | null; createdAt: Date; players: { playerIndex: number; name: string; key: string }[] }[]
> => {
  const gameRows = await db
    .select({
      id: games.id,
      key: games.key,
      language: games.language,
      whosTurn: games.whosTurn,
      createdAt: games.createdAt,
    })
    .from(games)
    .where(and(isNull(games.endMessage), isNotNull(games.whosTurn)));

  const result = [];
  for (const g of gameRows) {
    const playerRows = await db
      .select({ playerIndex: gamePlayers.playerIndex, name: gamePlayers.name, key: gamePlayers.key })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, g.id))
      .orderBy(gamePlayers.playerIndex);
    result.push({ key: g.key, language: g.language, whosTurn: g.whosTurn, createdAt: g.createdAt, players: playerRows });
  }
  return result;
};

export const findGameByKey = async (
  key: string,
): Promise<{ game: GameDbRow; players: PlayerDbRow[]; turns: TurnDbRow[] } | null> => {
  const [gameRow] = await db
    .select()
    .from(games)
    .where(eq(games.key, key))
    .limit(1);

  if (!gameRow) return null;

  const playerRows = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameRow.id))
    .orderBy(gamePlayers.playerIndex);

  const turnRows = await db
    .select()
    .from(turns)
    .where(eq(turns.gameId, gameRow.id))
    .orderBy(turns.turnNumber);

  return {
    game: {
      id: gameRow.id,
      key: gameRow.key,
      language: gameRow.language,
      boardState: gameRow.boardState,
      letterBag: gameRow.letterBag,
      whosTurn: gameRow.whosTurn,
      passes: gameRow.passes,
      previousMove: gameRow.previousMove,
      endMessage: gameRow.endMessage,
      nextGameKey: gameRow.nextGameKey,
      createdAt: gameRow.createdAt,
    },
    players: playerRows.map((r) => ({
      playerIndex: r.playerIndex,
      name: r.name,
      email: r.email,
      key: r.key,
      score: r.score,
      rack: r.rack,
      tallyScore: r.tallyScore,
    })),
    turns: turnRows.map((r) => ({
      turnNumber: r.turnNumber,
      playerIndex: r.playerIndex,
      type: r.type,
      score: r.score,
      moveData: r.moveData,
      timestamp: r.timestamp,
    })),
  };
};
