
var game = 0;
var board = 0;
var rack = 0;
var boardUI = 0;

$(document).ready(function() {
    boardUI = new window.Scrabble.UI.Html(); // must be instantiated first (to listen to Core events)

    board = new window.Scrabble.Core.Board();
    rack = new window.Scrabble.Core.Rack();

    game = new window.Scrabble.Core.Game(board, rack);

    rack.GenerateRandomTiles();
});
