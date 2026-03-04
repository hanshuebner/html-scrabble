import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 32 }).notNull().unique(),
    language: varchar('language', { length: 32 }).notNull(),
    boardState: jsonb('board_state').notNull(),
    letterBag: jsonb('letter_bag').notNull(),
    whosTurn: integer('whos_turn'),
    passes: integer('passes').notNull().default(0),
    previousMove: jsonb('previous_move'),
    endMessage: jsonb('end_message'),
    nextGameKey: varchar('next_game_key', { length: 32 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('games_key_idx').on(table.key)],
);

export const gamePlayers = pgTable(
  'game_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    playerIndex: integer('player_index').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    key: varchar('key', { length: 32 }).notNull(),
    score: integer('score').notNull().default(0),
    rack: jsonb('rack').notNull(),
    tallyScore: integer('tally_score'),
  },
  (table) => [index('game_players_game_id_idx').on(table.gameId)],
);

export const turns = pgTable(
  'turns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    turnNumber: integer('turn_number').notNull(),
    playerIndex: integer('player_index').notNull(),
    type: varchar('type', { length: 32 }).notNull(),
    score: integer('score').notNull().default(0),
    moveData: jsonb('move_data'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (table) => [index('turns_game_id_idx').on(table.gameId)],
);

export const userStats = pgTable('user_stats', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  gamesPlayed: integer('games_played').notNull().default(0),
  gamesWon: integer('games_won').notNull().default(0),
  totalScore: integer('total_score').notNull().default(0),
  highestScore: integer('highest_score').notNull().default(0),
  highestWordScore: integer('highest_word_score').notNull().default(0),
  highestWord: varchar('highest_word', { length: 255 }),
  averageScore: integer('average_score').notNull().default(0),
  totalTilesPlaced: integer('total_tiles_placed').notNull().default(0),
  bingoCount: integer('bingo_count').notNull().default(0),
});

export const headToHead = pgTable(
  'head_to_head',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    opponentId: uuid('opponent_id')
      .notNull()
      .references(() => users.id),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.opponentId] })],
);
