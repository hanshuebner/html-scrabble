import crypto from 'crypto'
import { Board, LetterBag, Rack, Bag, Tile, Square, calculateMove } from '@scrabble/shared'
import type { Language, TilePlacement, TurnData, EndMessage } from '@scrabble/shared'
import { sendGameInvitation } from '../email/email-service.js'
import { config } from '../config.js'
import {
  insertGameWithPlayers,
  persistTurn,
  updateGameState,
  findGameByKey,
  findActiveGames,
} from '../db/game-repository.js'
import type { PlayerInsertData } from '../db/game-repository.js'

const makeKey = (): string => {
  return crypto.randomBytes(8).toString('hex')
}

// ── In-memory game representation ───────────────────────────────────────────

export interface Player {
  name: string
  email: string
  key: string
  index: number
  score: number
  rack: Rack
  tallyScore?: number
}

interface PreviousMove {
  placements: [Square, Square][]
  newTiles: Tile[]
  score: number
  player: Player
}

export interface Game {
  dbId: string
  key: string
  language: Language
  players: Player[]
  board: Board
  letterBag: LetterBag
  turns: TurnData[]
  whosTurn: number | undefined
  passes: number
  previousMove: PreviousMove | null
  endMessage: EndMessage | null
  nextGameKey: string | null
  createdAt: string
}

// ── Notify callbacks (set by socket handler) ────────────────────────────────

type NotifyFn = (gameKey: string, event: string, data: unknown) => void
let notifyListeners: NotifyFn = () => {}

export const setNotifyFn = (fn: NotifyFn): void => {
  notifyListeners = fn
}

type NotifyPlayerFn = (gameKey: string, playerIndex: number, event: string, data: unknown) => void
let notifyPlayer: NotifyPlayerFn = () => {}

export const setNotifyPlayerFn = (fn: NotifyPlayerFn): void => {
  notifyPlayer = fn
}

// ── Serialization helpers for DB persistence ────────────────────────────────

const serializeBoardState = (board: Board): unknown => {
  return board.squares.map((col) =>
    col.map((sq) => ({
      type: sq.type,
      x: sq.x,
      y: sq.y,
      tile: sq.tile ? { letter: sq.tile.letter, score: sq.tile.score } : null,
      tileLocked: sq.tileLocked,
    })),
  )
}

const deserializeBoardState = (data: any): Board => {
  const board = new Board()
  for (let x = 0; x < 15; x++) {
    for (let y = 0; y < 15; y++) {
      const saved = data[x][y]
      const sq = board.squares[x][y]
      if (saved.tile) {
        sq.placeTile(new Tile(saved.tile.letter, saved.tile.score), saved.tileLocked)
      }
    }
  }
  return board
}

const serializeLetterBag = (bag: LetterBag): unknown => {
  return {
    tiles: bag.tiles.map((t) => ({ letter: t.letter, score: t.score })),
    legalLetters: bag.legalLetters,
  }
}

const deserializeLetterBag = (data: any, language: Language = 'English'): LetterBag => {
  const bag = LetterBag.create(language)
  bag.tiles = data.tiles.map((t: any) => new Tile(t.letter, t.score))
  bag.legalLetters = data.legalLetters
  return bag
}

const serializeRack = (rack: Rack): unknown => {
  return rack.squares.map((sq) => ({
    tile: sq.tile ? { letter: sq.tile.letter, score: sq.tile.score } : null,
  }))
}

const deserializeRack = (data: any): Rack => {
  const rack = new Rack(data.length)
  for (let i = 0; i < data.length; i++) {
    if (data[i].tile) {
      rack.squares[i].placeTile(new Tile(data[i].tile.letter, data[i].tile.score))
    }
  }
  return rack
}

// ── DB serialization helpers ─────────────────────────────────────────────────

const serializePreviousMove = (pm: PreviousMove | null): unknown => {
  if (!pm) return null
  return {
    placements: pm.placements.map(([rackSq, boardSq]) => ({
      rackX: rackSq.x,
      boardX: boardSq.x,
      boardY: boardSq.y,
    })),
    newTiles: pm.newTiles.map((t) => ({ letter: t.letter, score: t.score })),
    score: pm.score,
    playerIndex: pm.player.index,
  }
}

const deserializePreviousMove = (data: any, game: Game): PreviousMove | null => {
  if (!data) return null
  try {
    return {
      placements: data.placements.map((p: any) => [
        game.players[data.playerIndex].rack.squares[p.rackX],
        game.board.squares[p.boardX][p.boardY],
      ]),
      newTiles: data.newTiles.map((t: any) => new Tile(t.letter, t.score)),
      score: data.score,
      player: game.players[data.playerIndex],
    }
  } catch {
    return null
  }
}

const serializeGameForDb = (
  game: Game,
): {
  gameData: Parameters<typeof insertGameWithPlayers>[0]
  players: PlayerInsertData[]
} => {
  return {
    gameData: {
      key: game.key,
      language: game.language,
      boardState: serializeBoardState(game.board),
      letterBag: serializeLetterBag(game.letterBag),
      whosTurn: game.whosTurn,
      passes: game.passes,
      previousMove: serializePreviousMove(game.previousMove),
      endMessage: game.endMessage,
      nextGameKey: game.nextGameKey,
    },
    players: game.players.map((p) => ({
      playerIndex: p.index,
      name: p.name,
      email: p.email,
      key: p.key,
      score: p.score,
      rack: serializeRack(p.rack),
      tallyScore: p.tallyScore,
    })),
  }
}

const deserializeGameFromDb = (dbRows: NonNullable<Awaited<ReturnType<typeof findGameByKey>>>): Game => {
  const { game: g, players: pRows, turns: tRows } = dbRows
  const language = g.language as Language
  const board = deserializeBoardState(g.boardState)
  const letterBag = deserializeLetterBag(g.letterBag, language)

  const players: Player[] = pRows.map((p) => ({
    name: p.name,
    email: p.email,
    key: p.key,
    index: p.playerIndex,
    score: p.score,
    rack: deserializeRack(p.rack),
    tallyScore: p.tallyScore ?? undefined,
  }))

  const turnData: TurnData[] = tRows.map((t) => ({
    ...(t.moveData as any),
    type: t.type as TurnData['type'],
    player: t.playerIndex,
    score: t.score,
    timestamp: t.timestamp.toISOString(),
  }))

  const game: Game = {
    dbId: g.id,
    key: g.key,
    language,
    players,
    board,
    letterBag,
    turns: turnData,
    whosTurn: g.whosTurn ?? undefined,
    passes: g.passes,
    previousMove: null,
    endMessage: (g.endMessage as EndMessage) || null,
    nextGameKey: g.nextGameKey,
    createdAt: g.createdAt.toISOString(),
  }

  game.previousMove = deserializePreviousMove(g.previousMove, game)
  return game
}

// ── Core game operations ────────────────────────────────────────────────────

export const createGame = async (
  language: Language,
  playerInputs: { name: string; email: string; key?: string }[],
): Promise<Game> => {
  const letterBag = LetterBag.create(language)
  const board = new Board()

  const players: Player[] = playerInputs.map((input, i) => {
    const rack = new Rack(8)
    for (let j = 0; j < 7; j++) {
      const tile = letterBag.getRandomTile()
      if (tile) rack.squares[j].placeTile(tile)
    }
    return {
      name: input.name,
      email: input.email,
      key: input.key || makeKey(),
      index: i,
      score: 0,
      rack,
    }
  })

  const game: Game = {
    dbId: '',
    key: makeKey(),
    language,
    players,
    board,
    letterBag,
    turns: [],
    whosTurn: 0,
    passes: 0,
    previousMove: null,
    endMessage: null,
    nextGameKey: null,
    createdAt: new Date().toISOString(),
  }

  const { gameData, players: playerData } = serializeGameForDb(game)
  game.dbId = await insertGameWithPlayers(gameData, playerData)

  // Send invitations
  for (const player of players) {
    const otherNames = players.filter((p) => p !== player).map((p) => p.name)
    const link = makeGameLink(game.key, player.key)
    sendGameInvitation(player.email, player.name, link, otherNames)
  }

  return game
}

export const loadGame = async (key: string): Promise<Game | null> => {
  const dbRows = await findGameByKey(key)
  if (!dbRows) return null
  return deserializeGameFromDb(dbRows)
}

export const makeGameLink = (gameKey: string, playerKey?: string): string => {
  let url = config.baseUrl + 'game/' + gameKey
  if (playerKey) url += '/' + playerKey
  return url
}

export const lookupPlayer = (game: Game, playerKey: string): Player | null => {
  return game.players.find((p) => p.key === playerKey) || null
}

const ensurePlayerAndGame = (game: Game, player: Player): void => {
  if (game.endMessage) {
    throw new Error(`this game has ended: ${game.endMessage.reason}`)
  }
  if (game.whosTurn === undefined || player !== game.players[game.whosTurn]) {
    throw new Error("not this player's turn")
  }
}

export const remainingTileCounts = (game: Game): { letterBag: number; players: number[] } => {
  return {
    letterBag: game.letterBag.remainingTileCount(),
    players: game.players.map((player) => {
      let count = 0
      player.rack.squares.forEach((sq) => {
        if (sq.tile) count++
      })
      return count
    }),
  }
}

// ── makeMove ────────────────────────────────────────────────────────────────

export const makeMove = (
  game: Game,
  player: Player,
  placementList: TilePlacement[],
): { newTiles: Tile[]; turn: TurnData } => {
  ensurePlayerAndGame(game, player)

  const rackSquares = player.rack.squares.slice()
  const placements: [Square, Square][] = placementList.map((placement) => {
    let fromSquare: Square | null = null
    for (let i = 0; i < rackSquares.length; i++) {
      const square = rackSquares[i]
      if (
        square &&
        square.tile &&
        (square.tile.letter === placement.letter || (square.tile.isBlank() && placement.blank))
      ) {
        if (placement.blank) {
          square.tile.letter = placement.letter
        }
        fromSquare = square
        delete (rackSquares as any)[i]
        break
      }
    }
    if (!fromSquare) {
      throw new Error(`cannot find letter ${placement.letter} in rack of player ${player.name}`)
    }
    const toSquare = game.board.squares[placement.x][placement.y]
    if (toSquare.tile) {
      throw new Error(`target tile ${placement.x}/${placement.y} is already occupied`)
    }
    return [fromSquare, toSquare] as [Square, Square]
  })

  // Place tiles on board
  placements.forEach(([from, to]) => {
    const tile = from.tile!
    from.placeTile(null)
    to.placeTile(tile)
  })

  const move = calculateMove(game.board.squares)
  if (move.error) {
    // Roll back
    placements.forEach(([from, to]) => {
      const tile = to.tile!
      to.placeTile(null)
      from.placeTile(tile)
    })
    throw new Error(move.error)
  }

  // Lock tiles
  placements.forEach(([, to]) => {
    to.tileLocked = true
  })

  // Add score
  player.score += move.score!

  // Get new tiles
  const newTiles = game.letterBag.getRandomTiles(placements.length)
  for (let i = 0; i < newTiles.length; i++) {
    placements[i][0].placeTile(newTiles[i])
  }

  game.previousMove = {
    placements,
    newTiles,
    score: move.score!,
    player,
  }
  game.passes = 0

  const turn: TurnData = {
    type: 'move',
    player: player.index,
    score: move.score!,
    move,
    placements: move.tilesPlaced,
  }

  return { newTiles, turn }
}

// ── challengeOrTakeBack ─────────────────────────────────────────────────────

export const challengeOrTakeBackMove = (
  game: Game,
  type: 'challenge' | 'takeBack',
  player: Player,
): { newTiles: Tile[]; turn: TurnData } => {
  if (!game.previousMove) {
    throw new Error(`cannot ${type === 'challenge' ? 'challenge' : 'take back'} - no previous move to undo`)
  }
  const previousMove = game.previousMove
  game.previousMove = null

  const returnLetters: string[] = []
  previousMove.placements.forEach(([rackSquare, boardSquare]) => {
    if (rackSquare.tile) {
      returnLetters.push(rackSquare.tile.letter)
      game.letterBag.returnTile(rackSquare.tile)
      rackSquare.placeTile(null)
    }
    rackSquare.placeTile(boardSquare.tile!)
    boardSquare.placeTile(null)
  })
  previousMove.player.score -= previousMove.score

  const turn: TurnData = {
    type,
    challenger: player.index,
    player: previousMove.player.index,
    score: -previousMove.score,
    whosTurn: type === 'challenge' ? game.whosTurn! : previousMove.player.index,
    placements: previousMove.placements.map(([, boardSq]) => ({
      letter: '',
      score: 0,
      x: boardSq.x,
      y: boardSq.y,
      blank: false,
    })),
    returnLetters,
  }

  return { newTiles: [], turn }
}

// ── pass ────────────────────────────────────────────────────────────────────

export const pass = (game: Game, player: Player): { newTiles: Tile[]; turn: TurnData } => {
  ensurePlayerAndGame(game, player)
  game.previousMove = null
  game.passes++

  return {
    newTiles: [],
    turn: { type: 'pass', score: 0, player: player.index },
  }
}

// ── swapTiles ───────────────────────────────────────────────────────────────

export const swapTiles = (game: Game, player: Player, letters: string[]): { newTiles: Tile[]; turn: TurnData } => {
  ensurePlayerAndGame(game, player)

  if (game.letterBag.remainingTileCount() < 7) {
    throw new Error(`cannot swap, letterbag contains only ${game.letterBag.remainingTileCount()} tiles`)
  }

  game.previousMove = null
  game.passes = 0

  const rackLetters = new Bag(player.rack.letters())
  letters.forEach((letter) => {
    if (rackLetters.contains(letter)) {
      rackLetters.remove(letter)
    } else {
      throw new Error(`cannot swap, rack does not contain letter "${letter}"`)
    }
  })

  // Get new tiles first, then return old ones
  const newTiles = game.letterBag.getRandomTiles(letters.length)
  returnPlayerLetters(game, player, letters)

  const tmpNewTiles = newTiles.slice()
  player.rack.squares.forEach((square) => {
    if (!square.tile && tmpNewTiles.length) {
      square.placeTile(tmpNewTiles.pop()!)
    }
  })

  return {
    newTiles,
    turn: {
      type: 'swap',
      score: 0,
      count: letters.length,
      player: player.index,
    },
  }
}

const returnPlayerLetters = (game: Game, player: Player, letters: string[]): void => {
  const lettersToReturn = new Bag(letters)
  const tilesToReturn: Tile[] = []

  player.rack.squares.forEach((square) => {
    if (square.tile && lettersToReturn.contains(square.tile.letter)) {
      lettersToReturn.remove(square.tile.letter)
      tilesToReturn.push(square.tile)
      square.placeTile(null)
    }
  })

  game.letterBag.returnTiles(tilesToReturn)

  if (lettersToReturn.contents.length) {
    throw new Error(`could not find letters ${lettersToReturn.contents} to return on player's rack`)
  }
}

// ── finishTurn ──────────────────────────────────────────────────────────────

export const finishTurn = async (
  game: Game,
  player: Player,
  newTiles: Tile[],
  turn: TurnData,
): Promise<{ newTiles: Tile[] }> => {
  // Timestamp
  turn.timestamp = new Date().toISOString()

  // Store turn
  game.turns.push(turn)

  // Check game end conditions
  if (game.passes === game.players.length * 2) {
    finish(game, 'all players passed two times')
  } else if (player.rack.squares.every((sq) => !sq.tile)) {
    finish(game, `player ${game.whosTurn} ended the game`)
  } else if (turn.type !== 'challenge') {
    game.whosTurn = (game.whosTurn! + 1) % game.players.length
    turn.whosTurn = game.whosTurn
  }

  // Notify connected clients
  turn.remainingTileCounts = remainingTileCounts(game)
  notifyListeners(game.key, 'turn', turn)

  // Send updated rack to acting player (private data)
  if (newTiles.length > 0) {
    notifyPlayer(game.key, player.index, 'rack', serializeRack(player.rack))
  }

  // For challenge/takeBack, send rack to the player whose move was undone
  if ((turn.type === 'challenge' || turn.type === 'takeBack') && turn.player !== undefined) {
    const affectedPlayer = game.players[turn.player]
    if (affectedPlayer) {
      notifyPlayer(game.key, affectedPlayer.index, 'rack', serializeRack(affectedPlayer.rack))
    }
  }

  if (game.endMessage) {
    notifyListeners(game.key, 'gameEnded', game.endMessage)
  }

  // Persist to DB
  await persistTurn(
    game.dbId,
    {
      boardState: serializeBoardState(game.board),
      letterBag: serializeLetterBag(game.letterBag),
      whosTurn: game.whosTurn,
      passes: game.passes,
      previousMove: serializePreviousMove(game.previousMove),
      endMessage: game.endMessage,
    },
    game.players.map((p) => ({
      playerIndex: p.index,
      score: p.score,
      rack: serializeRack(p.rack),
      tallyScore: p.tallyScore,
    })),
    {
      turnNumber: game.turns.length - 1,
      playerIndex: turn.player,
      type: turn.type,
      score: turn.score,
      moveData: turn,
    },
  )

  return { newTiles }
}

// ── finish ──────────────────────────────────────────────────────────────────

export const finish = (game: Game, reason: string): void => {
  game.whosTurn = undefined

  let playerWithNoTiles: Player | null = null
  let pointsRemainingOnRacks = 0

  game.players.forEach((player) => {
    let tilesLeft = false
    let rackScore = 0
    player.rack.squares.forEach((square) => {
      if (square.tile) {
        rackScore += square.tile.score
        tilesLeft = true
      }
    })
    if (tilesLeft) {
      player.score -= rackScore
      player.tallyScore = -rackScore
      pointsRemainingOnRacks += rackScore
    } else {
      if (playerWithNoTiles) {
        throw new Error('unexpectedly found more than one player with no tiles when finishing game')
      }
      playerWithNoTiles = player
    }
  })

  if (playerWithNoTiles) {
    ;(playerWithNoTiles as Player).score += pointsRemainingOnRacks
    ;(playerWithNoTiles as Player).tallyScore = pointsRemainingOnRacks
  }

  game.endMessage = {
    reason,
    players: game.players.map((player) => ({
      name: player.name,
      score: player.score,
      tallyScore: player.tallyScore,
      rack: {
        squares: player.rack.squares.map((sq) => ({
          tile: sq.tile ? { letter: sq.tile.letter, score: sq.tile.score } : null,
        })),
      },
    })),
  }
}

// ── createFollowonGame ──────────────────────────────────────────────────────

export const createFollowonGame = async (game: Game, startPlayer: Player): Promise<Game> => {
  if (game.nextGameKey) {
    throw new Error(`followon game already created: old ${game.key} new ${game.nextGameKey}`)
  }

  const playerCount = game.players.length
  const newPlayerInputs = []
  for (let i = 0; i < playerCount; i++) {
    const oldPlayer = game.players[(i + startPlayer.index) % playerCount]
    newPlayerInputs.push({
      name: oldPlayer.name,
      email: oldPlayer.email,
      key: oldPlayer.key,
    })
  }

  const newGame = await createGame(game.language, newPlayerInputs)

  game.endMessage!.nextGameKey = newGame.key
  game.nextGameKey = newGame.key

  // Persist old game's updated nextGameKey
  await updateGameState(game.dbId, {
    nextGameKey: newGame.key,
    endMessage: game.endMessage,
  })

  notifyListeners(game.key, 'nextGame', newGame.key)

  return newGame
}

// ── getGameState (for client) ───────────────────────────────────────────────

export const getGameState = (game: Game, playerKey?: string) => {
  const thisPlayer = playerKey ? lookupPlayer(game, playerKey) : null

  return {
    key: game.key,
    language: game.language,
    whosTurn: game.whosTurn,
    remainingTileCounts: remainingTileCounts(game),
    legalLetters: game.letterBag.legalLetters,
    board: serializeBoardState(game.board),
    turns: game.turns,
    players: game.players.map((player) => ({
      name: player.name,
      score: player.score,
      rack: player === thisPlayer ? serializeRack(player.rack) : null,
    })),
    endMessage: game.endMessage,
  }
}

// ── listActiveGames ─────────────────────────────────────────────────────────

/**
 * Import a game from the migration script's JSON output.
 * Reconstructs Board, Rack, and LetterBag from plain data.
 */
export const importGame = async (data: any): Promise<Game> => {
  const board = deserializeBoardState(data.board)

  // Reconstruct letter bag
  const language = (data.language || 'English') as Language
  const letterBag = LetterBag.create(language)
  letterBag.tiles = (data.letterBag?.tiles || []).map((t: any) => new Tile(t.letter, t.score))

  const players: Player[] = (data.players || []).map((p: any, i: number) => ({
    name: p.name,
    email: p.email || '',
    key: p.key || makeKey(),
    index: i,
    score: p.score || 0,
    rack: deserializeRack(p.rack?.squares || []),
    tallyScore: p.tallyScore ?? undefined,
  }))

  const game: Game = {
    dbId: '',
    key: data.key,
    language,
    players,
    board,
    letterBag,
    turns: data.turns || [],
    whosTurn: data.whosTurn ?? 0,
    passes: data.passes || 0,
    previousMove: null,
    endMessage: data.endMessage || null,
    nextGameKey: data.nextGameKey || null,
    createdAt: data.createdAt || new Date().toISOString(),
  }

  // Persist to DB
  const { gameData, players: playerData } = serializeGameForDb(game)
  game.dbId = await insertGameWithPlayers(gameData, playerData)

  // Persist turns — imported data has moveData from migration script, normalize to match new game format
  const gameTurns = (data.turns || []) as any[]
  for (let i = 0; i < gameTurns.length; i++) {
    const t = gameTurns[i]
    const importedMove = t.moveData || {}
    const moveData: Record<string, unknown> = {
      type: t.type,
      player: t.player,
      score: t.score,
    }
    if (importedMove.words) moveData.move = { words: importedMove.words }
    if (importedMove.placements) moveData.placements = importedMove.placements
    if (t.timestamp) moveData.timestamp = t.timestamp

    await persistTurn(
      game.dbId,
      {
        boardState: serializeBoardState(game.board),
        letterBag: serializeLetterBag(game.letterBag),
        whosTurn: game.whosTurn,
        passes: game.passes,
        previousMove: null,
        endMessage: game.endMessage,
      },
      game.players.map((p) => ({
        playerIndex: p.index,
        score: p.score,
        rack: serializeRack(p.rack),
        tallyScore: p.tallyScore,
      })),
      {
        turnNumber: i,
        playerIndex: t.player,
        type: t.type,
        score: t.score,
        moveData,
      },
    )
  }

  return game
}

export const timeoutGame = async (gameKey: string): Promise<void> => {
  const game = await loadGame(gameKey)
  if (!game || game.endMessage) return

  finish(game, 'timed out')

  await updateGameState(game.dbId, {
    endMessage: game.endMessage,
  })

  console.log(`[scheduler] Timed out game ${gameKey}`)
}

export const listActiveGames = async () => {
  const dbGames = await findActiveGames()

  return dbGames.map((g) => ({
    key: g.key,
    language: g.language,
    players: g.players.map((p) => ({
      name: p.name,
      key: p.key,
      hasTurn: p.playerIndex === g.whosTurn,
    })),
    createdAt: g.createdAt.toISOString(),
  }))
}
