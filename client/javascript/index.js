
var game = 0;
var board = 0;
var rack = 0;
var boardUI = 0;

$(document).ready(function() {
    boardUI = new UI(); // must be instantiated first (to listen to Core events)

    board = new Board();
    rack = new Rack();

    game = new Game('German', board, rack);

    rack.GenerateRandomTiles();
});
