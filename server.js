
var repl = require('repl');
var fs = require('fs');
var io = require('socket.io');
var nodemailer = require('nodemailer');
var express = require('express');
var crypto = require('crypto');
var negotiate = require('express-negotiate');
var scrabble = require('./client/javascript/scrabble.js');
var icebox = require('./client/javascript/icebox.js');
var DB = require('./db.js');

var app = express.createServer();
var io = io.listen(app);
var db = new DB.DB('data.db');

var mailTransport = nodemailer.createTransport('SMTP', { hostname: 'localhost' });

// //////////////////////////////////////////////////////////////////////

function testMail() {
    transport.sendMail({ from: 'Hans Hübner <hans@huebner.org>',
                         to: [ 'hans.huebner@gmail.com' ],
                         subject: 'täst',
                         text: 'hälö from nodemailer',
                         html: 'here is your <a href="http://heise.de/">link</a>' },
                       function (err) {
                           if (err) {
                               console.log('sending mail failed', err);
                           } else {
                               console.log('mail sent');
                           }
                       });
}

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

db.registerObject(Game);

Game.create = function(language, players) {
    var game = new Game();
    game.language = language;
    game.players = players;
    game.key = makeKey();
    game.letterBag = scrabble.LetterBag.create(language);
    players.forEach(function (player) {
        player.rack = new scrabble.Rack();
        for (var i = 0; i < 7; i++) {
            player.rack.squares[i].tile = game.letterBag.getRandomTile();
        }
        console.log(player.rack);
    });
    game.board = new scrabble.Board();
    db.set(game.key, game);
    return game;
}

Game.load = function(key) {
    var raw = db.get(key);
    var game = new Game;
    for (var property in raw) {
        game[property] = raw[property];
    }
    return game;
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
            players.push({ name: name, email: email, key: makeKey() });
        }
    });

    console.log(players.length, 'players');
    var game = Game.create(req.body.language || 'German', players);

    res.redirect("/game/" + game.key + "/" + game.players[0].key);
});

function gameHandler(handler) {
    return function(req, res) {
        var gameKey = req.params.gameKey;
        var game = db.get(gameKey);
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
                                        rack: ((player == thisPlayer) ? player.rack : null) });
            }
            res.send(icebox.freeze(response));
        },
        'html': function () {
            res.sendfile(__dirname + '/client/index.html');
        }
    });
}));

app.put("/game/:gameKey", playerHandler(function(player, game, req, res) {
    console.log('put', game.key, 'player', player, 'command', req.body);
    res.send('ok');
}));

io.sockets.on('connection', function (socket) {
  socket.emit('join', { });
});

var repl = repl.start({
  prompt: "scrabble> ",
  input: process.stdin,
  output: process.stdout
});

repl.context.db = db;
repl.context.Game = Game;
repl.context.DB = DB;