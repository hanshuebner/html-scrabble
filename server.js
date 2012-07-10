
var _ = require('underscore');
var repl = require('repl');
var util = require('util');
var fs = require('fs');
var io = require('socket.io');
var nodemailer = require('nodemailer');
var express = require('express');
var crypto = require('crypto');
var negotiate = require('express-negotiate');
var scrabble = require('./client/javascript/scrabble.js');
var icebox = require('./client/javascript/icebox.js');
var DB = require('./db.js');

var EventEmitter = require('events').EventEmitter;

var app = express.createServer();
var io = io.listen(app);
var db = new DB.DB('data.db');

var smtp = nodemailer.createTransport('SMTP', { hostname: 'localhost' });

// //////////////////////////////////////////////////////////////////////

var baseUrl = 'http://localhost:9093/';
var mailSender = "Scrabble Server <scrabble@netzhansa.com>";

// //////////////////////////////////////////////////////////////////////

io.set('log level', 1);

app.configure(function() {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.static(__dirname + '/client'));
    app.use(express.errorHandler({
        dumpExceptions: true, 
        showStack: true
    }));
    app.use(app.router);
});

app.get("/", function(req, res) {
  res.redirect("/index.html");
});

db.on('load', function() {
    console.log('database loaded');

    app.listen(9093);
});

db.registerObject(scrabble.Tile);
db.registerObject(scrabble.Square);
db.registerObject(scrabble.Board);
db.registerObject(scrabble.Rack);
db.registerObject(scrabble.LetterBag);

function makeKey() {
    return crypto.randomBytes(8).toString('hex');
}

// Game //////////////////////////////////////////////////////////////////

function Game() {
}

util.inherits(Game, EventEmitter);

db.registerObject(Game);

Game.create = function(language, players) {
    var game = new Game();
    game.language = language;
    game.players = players;
    game.key = makeKey();
    game.letterBag = scrabble.LetterBag.create(language);
    for (var i = 0; i < players.length; i++) {
        var player = players[i];
        player.index = i;
        player.rack = new scrabble.Rack();
        for (var j = 0; j < 7; j++) {
            player.rack.squares[j].tile = game.letterBag.getRandomTile();
        }
        player.score = 0;
    }
    console.log('players', players);
    game.board = new scrabble.Board();
    game.whosTurn = 0;
    game.save();
    game.players.forEach(function (player) {
        game.sendInvitation(player);
    });
    return game;
}

Game.prototype.makeLink = function(player)
{
    var url = baseUrl + "game/" + this.key;
    if (player) {
        url += "/" + player.key;
    }
    return url;
}

function joinProse(array)
{
    var length = array.length;
    switch (length) {
    case 0:
        return "";
    case 1:
        return array[0];
    default:
        return _.reduce(array.slice(1, length - 1), function (word, accu) { return word + ", " + accu }, array[0]) + " and " + array[length - 1];
    }
}

Game.prototype.sendInvitation = function(player)
{
    smtp.sendMail({ from: mailSender,
                    to: [ player.email ],
                    subject: 'You have been invited to play Scrabble with ' + joinProse(_.pluck(_.without(this.players, player), 'name')),
                    text: 'Use this link to play:\n\n' + this.makeLink(player),
                    html: 'Click <a href="' + this.makeLink(player) + '">here</a> to play.' },
                  function (err) {
                      if (err) {
                          console.log('sending mail failed', err);
                      }
                  });
}

Game.prototype.save = function(key) {
    db.set(this.key, this);
}

Game.load = function(key) {
    if (!this.games) {
        this.games = {};
    }
    if (!this.games[key]) {
        var game = db.get(key);
        if (!game) {
            throw "game " + key + " not found";
        }
        EventEmitter.call(game);
        game.connections = [];
        Object.defineProperty(game, 'connections', { enumerable: false }); // makes connections non-persistent
        this.games[key] = game;
    }
    return this.games[key];
}

Game.prototype.lookupPlayer = function(req) {
    var playerKey = req.cookies[this.key];
    for (var i in this.players) {
        if (this.players[i].key == playerKey) {
            return this.players[i];
        }
    }
    throw "invalid player key " + playerKey + " for game " + this.key;
}

Game.prototype.makeMove = function(player, placementList) {
    console.log('makeMove', placementList);
    var game = this;
    // determine if it is this player's turn
    if (player !== game.players[game.whosTurn]) {
        throw "not this player's turn";
    }
    // validate the move (i.e. does the user have the tiles placed, are the tiles free on the board
    var rackSquares = player.rack.squares.slice();          // need to clone
    var placements = placementList.map(function (placement) {
        var fromSquare = null;
        for (var i = 0; i < rackSquares.length; i++) {
            var square = rackSquares[i];
            if (square && square.tile && square.tile.letter == placement.letter) {
                fromSquare = square;
                delete rackSquares[i];
                break;
            }
        }
        if (!fromSquare) {
            throw 'cannot find letter ' + placement.letter + ' in rack of player ' + player.name;
        }
        var toSquare = game.board.squares[placement.x][placement.y];
        if (toSquare.tile) {
            throw 'target tile ' + placement.x + '/' + placement.y + ' is already occupied';
        }
        return [fromSquare, toSquare];
    });
    placements.forEach(function(squares) {
        var tile = squares[0].tile;
        squares[0].placeTile(null);
        squares[1].placeTile(tile);
    });
    var move = scrabble.calculateMove(game.board.squares);
    if (move.error) {
        // fixme should be generalized function -- wait, no rollback? :|
        placements.forEach(function(squares) {
            var tile = squares[1].tile;
            squares[1].placeTile(null);
            squares[0].placeTile(tile);
        });
        throw move.error;
    }
    placements.forEach(function(squares) {
        squares[1].tileLocked = true;
    });
    // add score
    move.words.forEach(function(word) {
        player.score += word.score;
    });
    // determine who's turn it is now
    game.whosTurn = (game.whosTurn + 1) % game.players.length;
    // get new tiles
    var newTiles = game.letterBag.getRandomTiles(placements.length);
    for (var i = 0; i < newTiles.length; i++) {
        placements[i][0].placeTile(newTiles[i]);
    }
    // store new game data
    game.save();

    // notify listeners
    game.connections.forEach(function (socket) {
        socket.emit('turn', { player: player.index,
                              placements: placementList,
                              nextTurn: player.whosTurn });
    });

    return { newTiles: newTiles };
}

Game.prototype.newConnection = function(socket) {
    var game = this;
    if (!game.connections) {
        game.connections = [];
    }
    game.connections.push(socket);
    socket.on('disconnect', function () {
        game.connections = _.without(game.connections, this);
    });
}

// Handlers //////////////////////////////////////////////////////////////////

app.get("/game", function(req, res) {
    res.sendfile(__dirname + '/client/make-game.html');
});

app.post("/game", function(req, res) {

    var players = [];
    [1, 2, 3, 4].forEach(function (x) {
        var name = req.body['name' + x];
        var email = req.body['email' + x];
        console.log('name', name, 'email', email, 'params', req.params);
        if (name && email) {
            players.push({ name: name,
                           email: email,
                           key: makeKey() });
        }
    });

    console.log(players.length, 'players');
    var game = Game.create(req.body.language || 'German', players);

    res.redirect("/game/" + game.key + "/" + game.players[0].key);
});

function gameHandler(handler) {
    return function(req, res) {
        var gameKey = req.params.gameKey;
        var game = Game.load(gameKey);
        if (!game) {
            throw "Game " + req.params.gameKey + " does not exist";
        }
        handler(game, req, res);
    }
}

function playerHandler(handler) {
    return gameHandler(function(game, req, res) {
        var player = game.lookupPlayer(req);
        handler(player, game, req, res);
    });
}
        

app.get("/game/:gameKey/:playerKey", gameHandler(function (game, req, res) {
    res.cookie(req.params.gameKey, req.params.playerKey, { path: '/', maxAge: (30 * 24 * 60 * 60 * 1000) });
    res.redirect("/game/" + req.params.gameKey);
}));

app.get("/game/:gameKey", gameHandler(function (game, req, res, next) {
    req.negotiate({
        'application/json': function () {
            var response = { board: game.board, players: [] }
            var thisPlayer = game.lookupPlayer(req);
            for (var i = 0; i < game.players.length; i++) {
                var player = game.players[i];
                response.players.push({ name: player.name,
                                        score: player.score,
                                        rack: ((player == thisPlayer) ? player.rack : null),
                                        yourTurn: (i == game.whosTurn) });
            }
            res.send(icebox.freeze(response));
        },
        'html': function () {
            res.sendfile(__dirname + '/client/index.html');
        }
    });
}));

app.put("/game/:gameKey", playerHandler(function(player, game, req, res) {
    var body = icebox.thaw(req.body);
    console.log('put', game.key, 'player', player.name, 'command', body.command, 'arguments', req.body.arguments);
    switch (req.body.command) {
    case 'makeMove':
        res.send(icebox.freeze(game.makeMove(player, body.arguments)));
        break;
    default:
        throw 'unrecognized game PUT command: ' + body.command;
    }
}));

io.sockets.on('connection', function (socket) {
    socket.on('join', function (data) {
        var game = Game.load(data.gameKey);
        if (!game) {
            throw "game " + data.gameKey + " not found";
        }
        game.newConnection(this);
    });
});

var repl = repl.start({
  prompt: "scrabble> ",
  input: process.stdin,
  output: process.stdout
});

repl.context.db = db;
repl.context.Game = Game;
repl.context.DB = DB;
