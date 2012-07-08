
var repl = require('repl');
var fs = require('fs');
var io = require('socket.io');
var nodemailer = require('nodemailer');
var express = require('express');
var crypto = require('crypto');
var negotiate = require('express-negotiate');
var scrabble = require('./client/javascript/scrabble.js');
var icebox = require('./client/javascript/icebox.js');
var cycle = require('cycle');
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

function makeKey() {
    return crypto.randomBytes(8).toString('hex');
}

function Game() {
}

db.registerObject(Game);
db.registerObject(scrabble.Tile);
db.registerObject(scrabble.Square);
db.registerObject(scrabble.Board);
db.registerObject(scrabble.Rack);
db.registerObject(scrabble.LetterBag);

Game.create = function(language, players) {
    var game = new Game();
    game.language = language;
    game.players = players;
    game.key = makeKey();
    game.letterBag = scrabble.LetterBag.create(language);
    players.forEach(function (player) {
        player.rack = new scrabble.Rack();
        for (var i = 0; i < 7; i++) {
            player.rack.Squares[i] = game.letterBag.GetRandomTile();
        }
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

app.get("/game/:gameId/:playerId", function(req, res) {
    if (!db.get(req.params.gameId)) {
        throw "Game " + req.params.gameId + " does not exist";
    }

    res.cookie(req.params.gameId, req.params.playerId, { path: '/', maxAge: (30 * 24 * 60 * 60 * 1000) });
    res.redirect("/game/" + req.params.gameId);
});

app.get("/game/:gameId", function (req, res, next) {
    var gameId = req.params.gameId;
    var game = db.get(gameId);
    if (!game) {
        throw "Game " + req.params.gameId + " does not exist";
    }
    req.negotiate({
        'application/json': function () {
            var response = { board: game.board, players: [] }
            var playerKey = req.cookies[gameId];
            for (var i = 0; i < game.players.length; i++) {
                var player = game.players[i];
                response.players.push({ name: player.name,
                                        score: player.score,
                                        rack: ((player.key == playerKey) ? player.rack : null) });
            }
            res.send(cycle.decycle(icebox.freeze(response)));
        },
        'html': function () {
            res.sendfile(__dirname + '/client/index.html');
        }
    });
});

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