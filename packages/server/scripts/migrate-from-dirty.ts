/**
 * Migration script: converts old dirty-style data.db game data to the new format.
 *
 * Usage:
 *   cd packages/server
 *   npx tsx scripts/migrate-from-dirty.ts <path-to-data.db>
 *
 * The data.db file is a "dirty" database: one JSON record per line, each with
 * the shape { "key": "<gameKey>", "val": <icebox-frozen game object> }.
 *
 * dirty appends a new line on every save(), so the LAST line for a given key
 * is the most recent state. We deduplicate accordingly.
 *
 * The icebox format uses _id/_ref for circular references and _constructorName
 * to tag objects (Tile, Square, Board, Rack, LetterBag, Bag, Game).
 * Thawed objects can have circular refs (e.g. rack.owner -> player -> rack),
 * so we extract only the plain data we need.
 */

import { readFileSync, writeFileSync } from 'fs';

// --- Icebox thaw (ported from icebox.js) ---

function thaw(object: any, prototypeMap: Record<string, any>): any {
  const objectsThawed: any[] = [];

  function thawTree(obj: any): any {
    if (obj && typeof obj === 'object') {
      if (obj._ref !== undefined) {
        return objectsThawed[obj._ref] ?? obj;
      }

      let thawed: any;
      if (obj._constructorName === 'Date') {
        thawed = new Date(obj._isoString);
      } else {
        thawed = typeof obj.length === 'undefined' ? {} : [];
        if (obj._constructorName && prototypeMap[obj._constructorName]) {
          Object.setPrototypeOf(thawed, prototypeMap[obj._constructorName].prototype);
        }
        if (obj._id !== undefined) {
          objectsThawed[obj._id] = thawed;
        }
        for (const prop in obj) {
          if (
            Object.prototype.hasOwnProperty.call(obj, prop) &&
            prop !== '_constructorName' &&
            prop !== '_id'
          ) {
            thawed[prop] = thawTree(obj[prop]);
          }
        }
      }
      return thawed;
    }
    return obj;
  }

  return thawTree(object);
}

// Stub prototypes so icebox thaw doesn't discard properties
const prototypeMap: Record<string, any> = {
  Game: { prototype: {} },
  Board: { prototype: {} },
  Square: { prototype: {} },
  Tile: { prototype: {} },
  Rack: { prototype: {} },
  LetterBag: { prototype: {} },
  Bag: { prototype: {} },
};

// --- Safe extraction helpers (avoid following circular refs) ---

function extractTile(tile: any): { letter: string; score: number } | null {
  if (!tile || typeof tile !== 'object') return null;
  return { letter: String(tile.letter ?? ''), score: Number(tile.score ?? 0) };
}

function extractRackSquares(rack: any): { tile: { letter: string; score: number } | null }[] {
  if (!rack?.squares || !Array.isArray(rack.squares)) return [];
  return rack.squares.map((sq: any) => ({
    tile: extractTile(sq?.tile),
  }));
}

function extractEndMessage(msg: any): any {
  if (!msg || typeof msg !== 'object') return null;
  // Build a plain copy with only the fields we need
  return {
    reason: msg.reason || '',
    players: Array.isArray(msg.players)
      ? msg.players.map((p: any) => ({
          name: p.name || '',
          score: p.score || 0,
          tallyScore: p.tallyScore ?? 0,
          rack: { squares: extractRackSquares(p.rack) },
        }))
      : [],
  };
}

function extractMove(move: any): any {
  if (!move || typeof move !== 'object') return null;
  // Only keep serializable parts
  const result: any = {};
  if (move.words) {
    result.words = Array.isArray(move.words)
      ? move.words.map((w: any) => ({
          word: w.word || '',
          score: w.score || 0,
        }))
      : [];
  }
  if (move.placements) {
    result.placements = Array.isArray(move.placements)
      ? move.placements.map((p: any) => ({
          letter: p.letter || '',
          x: p.x ?? 0,
          y: p.y ?? 0,
          blank: !!p.blank,
        }))
      : [];
  }
  return result;
}

// --- Conversion ---

function convertGame(key: string, frozenData: any) {
  const game = thaw(frozenData, prototypeMap);

  // Board: 15x15 grid
  const board: any[][] = [];
  if (game.board?.squares) {
    for (let x = 0; x < 15; x++) {
      board[x] = [];
      for (let y = 0; y < 15; y++) {
        const sq = game.board.squares[x]?.[y];
        board[x][y] = {
          type: sq?.type || 'Normal',
          x,
          y,
          tile: extractTile(sq?.tile),
          tileLocked: sq?.tileLocked ?? false,
        };
      }
    }
  }

  // Players - extract only plain data, skip circular refs like rack.owner
  const players = (game.players || []).map((p: any, i: number) => ({
    index: i,
    name: p.name || `Player ${i + 1}`,
    email: p.email || '',
    key: p.key || '',
    score: p.score || 0,
    tallyScore: p.tallyScore ?? null,
    rack: { squares: extractRackSquares(p.rack) },
  }));

  // Letter bag tiles
  const bagTiles = (game.letterBag?.tiles || []).map((t: any) => extractTile(t)).filter(Boolean);

  // Turns - extract only serializable data
  const turns = (game.turns || []).map((t: any, i: number) => ({
    turnNumber: i,
    playerIndex: t.player ?? 0,
    type: t.type || 'move',
    score: t.score || 0,
    moveData: extractMove(t.move),
    timestamp: t.timestamp || null,
  }));

  return {
    key,
    language: game.language || 'English',
    board,
    players,
    letterBag: { tiles: bagTiles },
    whosTurn: game.whosTurn ?? 0,
    passes: game.passes || 0,
    previousMove: null, // don't try to serialize the old format
    endMessage: extractEndMessage(game.endMessage),
    nextGameKey: game.nextGameKey || null,
    createdAt: game.creationTimestamp || null,
    turns,
  };
}

// --- Main ---

function main() {
  const dbPath = process.argv[2];
  if (!dbPath) {
    console.error(
      'Usage: npx tsx scripts/migrate-from-dirty.ts <path-to-data.db>\n\n' +
        'The data.db file is the dirty database from the old Scrabble server.\n' +
        'This script produces a JSON file you can import into the new server.',
    );
    process.exit(1);
  }

  const content = readFileSync(dbPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim());

  // dirty appends on every save - keep only the LAST entry per key
  const latestByKey = new Map<string, any>();
  let parseErrors = 0;

  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.key && record.val) {
        latestByKey.set(record.key, record.val);
      }
    } catch {
      parseErrors++;
    }
  }

  console.log(`Parsed ${lines.length} lines, ${latestByKey.size} unique game keys, ${parseErrors} parse errors.\n`);

  const games: any[] = [];
  let convertErrors = 0;

  for (const [key, frozenData] of latestByKey) {
    try {
      const converted = convertGame(key, frozenData);
      games.push(converted);

      const status = converted.endMessage ? 'finished' : 'in-progress';
      console.log(
        `  ${converted.key}  ${converted.language.padEnd(12)} ` +
          `${converted.players.map((p: any) => p.name).join(' vs ')}  ` +
          `[${status}, ${converted.turns.length} turns]`,
      );
    } catch (e) {
      convertErrors++;
      console.error(`  ${key}  ERROR: ${e}`);
    }
  }

  const outputPath = dbPath.replace(/\.db$/, '') + '-migrated.json';
  writeFileSync(outputPath, JSON.stringify(games, null, 2));

  console.log(`\nDone: ${games.length} games migrated, ${convertErrors} conversion errors.`);
  console.log(`Output: ${outputPath}`);
  console.log(
    `\nTo import into the new server, run:\n` +
      `  curl -X POST http://localhost:3000/api/games/import \\\n` +
      `    -H "Content-Type: application/json" \\\n` +
      `    -d @${outputPath}`,
  );
}

main();
