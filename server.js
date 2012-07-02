
var repl = require('repl');
var fs = require('fs');
var io = require('socket.io');
var nodemailer = require('nodemailer');
var express = require('express');
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

app.listen(9093);

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

