
var repl = require('repl');
var fs = require('fs');
var io = require('socket.io');
var nodemailer = require('nodemailer');
var express = require('express');
var crypto = require('crypto');
var scrabble = require('./client/javascript/scrabble.js');

var db = require('dirty')('data.db');

var app = express.createServer();
var io = io.listen(app);

var mailTransport = nodemailer.createTransport('SMTP', { hostname: 'localhost' });

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

io.set('log level', 2);

app.configure(function() {
  app.use(express.methodOverride());
  app.use(express.bodyParser());
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

function Game(language, players) {
    this.language = language;
    this.players = players;
    this.key = makeKey();
    this.letterBag = new scrabble.LetterBag(language);
    db.set(this.key, this);
}

app.post("/create-game", function(req, res) {

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
    new Game(req.body.language || 'German',
             players);

    res.redirect("/index.html");
});

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

var repl = repl.start({
  prompt: "scrabble> ",
  input: process.stdin,
  output: process.stdout
});

