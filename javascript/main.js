/*
  Coding Exercise: multiplayer online Scrabble(tm) clone written in
  modern HTML, CSS, and JavaScript

  IMPORTANT COPYRIGHT NOTICE:

  SCRABBLE® is a registered trademark. All intellectual property
  rights in and to the game are owned in the U.S.A and Canada by
  Hasbro Inc., and throughout the rest of the world by J.W. Spear &
  Sons Limited of Maidenhead, Berkshire, England, a subsidiary of
  Mattel Inc.

  This experimental project is not associated with any of the owners
  of the Scrabble brand.

*/

/*
  Useful references:

  http://en.wikipedia.org/wiki/Scrabble_letter_distributions

  http://en.wikipedia.org/wiki/Scrabble
  http://fr.wikipedia.org/wiki/Scrabble

  http://www.hasbro.com/scrabble/en_US/glossary.cfm
  http://www.hasbro.com/scrabble/en_US/rulesSetup.cfm

*/

/*
  Similar HTML/Javascript projects:

  http://www.themaninblue.com/writing/perspective/2004/01/27/

  http://code.google.com/p/scrabbly/source/browse/trunk/scrabble.js
*/

var letterDistributions = {
    'English':  [ { Letter: null, Score: 0, Count: 2},
		  
		  { Letter: "E", Score: 1, Count: 12},
		  { Letter: "A", Score: 1, Count: 9},
		  { Letter: "I", Score: 1, Count: 9},
		  { Letter: "O", Score: 1, Count: 8},
		  { Letter: "N", Score: 1, Count: 6},
		  { Letter: "R", Score: 1, Count: 6},
		  { Letter: "T", Score: 1, Count: 6},
		  { Letter: "L", Score: 1, Count: 4},
		  { Letter: "S", Score: 1, Count: 4},
		  { Letter: "U", Score: 1, Count: 4},
		  
		  { Letter: "D", Score: 2, Count: 4},
		  { Letter: "G", Score: 2, Count: 3},
		  
		  { Letter: "B", Score: 3, Count: 2},
		  { Letter: "C", Score: 3, Count: 2},
		  { Letter: "M", Score: 3, Count: 2},
		  { Letter: "P", Score: 3, Count: 2},
		  
		  { Letter: "F", Score: 4, Count: 2},
		  { Letter: "H", Score: 4, Count: 2},
		  { Letter: "V", Score: 4, Count: 2},
		  { Letter: "W", Score: 4, Count: 2},
		  { Letter: "Y", Score: 4, Count: 2},
		  
		  { Letter: "K", Score: 5, Count: 1},
		  
		  { Letter: "J", Score: 8, Count: 1},
		  { Letter: "X", Score: 8, Count: 1},
		  
		  { Letter: "Q", Score: 10, Count: 1},
		  { Letter: "Z", Score: 10, Count: 1}],
    'French': [ { Letter: null, Score: 0, Count: 2},
		
		{ Letter: "E", Score: 1, Count: 15},
		{ Letter: "A", Score: 1, Count: 9},
		{ Letter: "I", Score: 1, Count: 8},
		{ Letter: "N", Score: 1, Count: 6},
		{ Letter: "O", Score: 1, Count: 6},
		{ Letter: "R", Score: 1, Count: 6},
		{ Letter: "S", Score: 1, Count: 6},
		{ Letter: "T", Score: 1, Count: 6},
		{ Letter: "U", Score: 1, Count: 6},
		{ Letter: "L", Score: 1, Count: 5},
		
		{ Letter: "D", Score: 2, Count: 3},
		{ Letter: "G", Score: 2, Count: 2},
		{ Letter: "M", Score: 3, Count: 3},
		
		{ Letter: "B", Score: 3, Count: 2},
		{ Letter: "C", Score: 3, Count: 2},
		{ Letter: "P", Score: 3, Count: 2},
		
		{ Letter: "F", Score: 4, Count: 2},
		{ Letter: "H", Score: 4, Count: 2},
		{ Letter: "V", Score: 4, Count: 2},
		
		{ Letter: "J", Score: 8, Count: 1},
		{ Letter: "Q", Score: 8, Count: 1},

		{ Letter: "K", Score: 10, Count: 1},
		{ Letter: "W", Score: 10, Count: 1},
		{ Letter: "X", Score: 10, Count: 1},
		{ Letter: "Y", Score: 10, Count: 1},
		{ Letter: "Z", Score: 10, Count: 1}
	      ],
    'German': [ { Letter: null, Score: 0, Count: 2},
		
		{ Letter: "E", Score: 1, Count: 15},
		{ Letter: "N", Score: 1, Count: 9},
		{ Letter: "S", Score: 1, Count: 7},
		{ Letter: "I", Score: 1, Count: 6},
		{ Letter: "R", Score: 1, Count: 6},
		{ Letter: "T", Score: 1, Count: 6},
		{ Letter: "U", Score: 1, Count: 6},
		{ Letter: "A", Score: 1, Count: 5},
		{ Letter: "D", Score: 1, Count: 4},
		
		{ Letter: "H", Score: 2, Count: 4},
		{ Letter: "G", Score: 2, Count: 3},
		{ Letter: "L", Score: 2, Count: 3},
		{ Letter: "O", Score: 2, Count: 3},

		{ Letter: "M", Score: 3, Count: 4},
		{ Letter: "B", Score: 3, Count: 2},
		{ Letter: "W", Score: 3, Count: 1},
		{ Letter: "Z", Score: 3, Count: 1},
		
		{ Letter: "C", Score: 4, Count: 2},
		{ Letter: "F", Score: 4, Count: 2},
		{ Letter: "K", Score: 4, Count: 2},
		{ Letter: "P", Score: 4, Count: 1},
		
		{ Letter: "Ä", Score: 6, Count: 1},
		{ Letter: "J", Score: 6, Count: 1},
		{ Letter: "Ü", Score: 6, Count: 1},
		{ Letter: "V", Score: 6, Count: 1},

		{ Letter: "Ö", Score: 8, Count: 1},
		{ Letter: "X", Score: 8, Count: 1},

		{ Letter: "Q", Score: 10, Count: 1},
		{ Letter: "Y", Score: 10, Count: 1}]};

function type_of(obj) {
    if (typeof(obj) == 'object')
	if (typeof obj.length == "undefined" || !obj.length)
	    return 'object';
    else
	return 'array';
    else
	return typeof(obj);
}

var IDPrefix_Board_SquareOrTile = "BoardSquareOrTile_";
var IDPrefix_Rack_SquareOrTile = "RackSquareOrTile_";
var IDPrefix_Letters_SquareOrTile = "LettersSquareOrTile_";

function PlayAudio(id) {
    var audio = document.getElementById(id);
    
    if (audio.playing) {
	audio.pause();
    }
    
    audio.defaultPlaybackRate = 1;
    audio.volume = 1;
    
    try {
	audio.currentTime = 0;
	audio.play();
    }
    catch(e) {
	function currentTime() {
	    audio.currentTime = 0;
	    audio.removeEventListener("canplay", currentTime, true);
	    audio.play();
	}
	audio.addEventListener("canplay", currentTime, true);
    }
}

function Tile(letter, score)
{
    this.Letter = letter;
    this.Score = score;
    this.Placed = false;
    
    this.isBlank = this.Letter == this.BlankLetter;
}

Tile.prototype.BlankLetter = "-";

Tile.prototype.toString = function() {
    return "Tile toString(): [" + this.Letter + "] --> " + this.Score;
}

SquareType = {
    Normal: 0,
    DoubleLetter: 1,
    DoubleWord: 2,
    TripleLetter: 3,
    TripleWord: 4
};

function Square(type) {
    this.Type = type;

    this.X = 0;
    this.Y = 0;

    this.Tile = null;
    this.TileLocked = false;
}

Square.prototype.PlaceTile = function(tile, locked) {
    if (this.Tile) {
	this.Tile.Placed = false;
    }

    this.Tile = tile;
    this.TileLocked = locked;

    if (tile) {
	if (tile.Placed) {
	    alert("Tile shouldn't already be placed on board or rack !! => " + tile);
	}
	tile.Placed = true;
    }
}

Square.prototype.toString = function() {
    return "Square toString(): " + this.Type;
}

function Board() {
    this.Squares = MakeBoardArray();
    this.Game = null;

    for (var y = 0; y < this.Dimension; y++) {
	for (var x = 0; x < this.Dimension; x++) {
	    var centerStart = false;

	    //SquareType.Normal, SquareType.DoubleLetter, SquareType.DoubleWord, SquareType.TripleLetter, SquareType.TripleWord
	    var square = new Square(SquareType.Normal);
	    
	    var middle = Math.floor(this.Dimension / 2);
	    var halfMiddle = Math.ceil(middle / 2);
	    
	    if ((x == 0 || x == this.Dimension - 1 || x == middle)
		&& (y == 0 || y == this.Dimension - 1 || y == middle && x != middle)) {
		square = new Square(SquareType.TripleWord);
	    } else if (x == middle && y == middle
		       || x > 0 && x < middle - 2 && (y == x || y == this.Dimension - x - 1)
		       || x > middle + 2 && x < this.Dimension - 1 && (x == y || x == this.Dimension - y - 1)) {
		square = new Square(SquareType.DoubleWord);
		if (x == middle && y == middle) {
		    centerStart = true;
		}
	    } else if ((x == middle - 1 || x == middle + 1)
		       && (y == middle - 1 || y == middle + 1)
		       || (x == 0 || x == this.Dimension - 1 || x == middle) && (y == middle + halfMiddle || y == middle - halfMiddle)
		       || (y == 0 || y == this.Dimension - 1 || y == middle) && (x == middle + halfMiddle || x == middle - halfMiddle)
		       || (y == middle + 1 || y == middle - 1) && (x == middle + halfMiddle + 1 || x == middle - halfMiddle - 1)
		       || (x == middle + 1 || x == middle - 1) && (y == middle + halfMiddle + 1 || y == middle - halfMiddle - 1)) {
		square = new Square(SquareType.DoubleLetter);
	    } else if ((x == middle - 2 || x == middle + 2)
		       && (y == middle - 2 || y == middle + 2)
		       || (y == middle + 2 || y == middle - 2) && (x == middle + halfMiddle + 2 || x == middle - halfMiddle - 2)
		       || (x == middle + 2 || x == middle - 2) && (y == middle + halfMiddle + 2 || y == middle - halfMiddle - 2)) {
		square = new Square(SquareType.TripleLetter);
	    }

	    square.X = x;
	    square.Y = y;
	    this.Squares[x][y] = square;
	}
    }

    $(document).trigger('BoardReady', [ this ]);
}

Board.prototype.Dimension = 15;

Board.prototype.RemoveFreeTiles = function() {
    var tiles = [];
    
    for (var y = 0; y < this.Dimension; y++) {
	for (var x = 0; x < this.Dimension; x++) {
	    var square = this.Squares[x][y];
	    
	    if (square.Tile && !square.Tile.Locked) {
		tiles.push(square.Tile);
		
		square.PlaceTile(null, false);
		
		$(document).trigger('BoardSquareTileChanged', [ this, square ]);
	    }
	}
    }
    
    return tiles;
}

Board.prototype.EmptyTiles = function() {
    for (var y = 0; y < this.Dimension; y++) {
	for (var x = 0; x < this.Dimension; x++) {
	    var square = this.Squares[x][y];
	    
	    square.PlaceTile(null, false);
	    
	    $(document).trigger('BoardSquareTileChanged', [ this, square ]);
	}
    }
}

Board.prototype.MoveTile = function(tileXY, squareXY) {
    if (tileXY.y == -1 || squareXY.y == -1) {
	if (this.Game) {
	    this.Game.MoveTile(tileXY, squareXY);
	}
	
	return;
    }
    
    var square1 = this.Squares[tileXY.x][tileXY.y];
    var square2 = this.Squares[squareXY.x][squareXY.y];

    var tile = square1.Tile;
    square1.PlaceTile(null, false);
    square2.PlaceTile(tile, false);

    PlayAudio('audio4');
    
    $(document).trigger('BoardSquareTileChanged', [ this, square1 ]);
    $(document).trigger('BoardSquareTileChanged', [ this, square2 ]);
}

Board.prototype.toString = function() {
    return "Board toString(): " + this.Dimension + " x " + this.Dimension;
}

function Rack () {
    this.Dimension = 8;
    this.Squares = [];
    this.Game = null;

    for (var x = 0; x < this.Dimension; x++) {
	var square = new Square(SquareType.Normal);
	square.X = x;
	square.Y = -1;
	this.Squares[x] = square;
    }

    $(document).trigger('RackReady', [ this ]);
}

Rack.prototype.TakeTilesBack = function() {
    var freeTilesCount = 0;
    for (var x = 0; x < this.Dimension; x++) {
	var square = this.Squares[x];
	if (!square.Tile) {
	    freeTilesCount++;
	}
    }
    
    freeTilesCount--;
    if (freeTilesCount <= 0) return;
    
    var tiles = this.Game.Board.RemoveFreeTiles();
    var count = tiles.length;

    if (count > freeTilesCount) {
	count = freeTilesCount;
    }
    
    for (var i = 0; i < count; i++) {
	for (var x = 0; x < this.Dimension; x++) {
	    var square = this.Squares[x];
	    if (!square.Tile) {
		square.PlaceTile(tiles[i], false);

		$(document).trigger('RackSquareTileChanged', [ this, square ]);
		
		break;
	    }
	}
    }
}

Rack.prototype.EmptyTiles = function() {
    for (var x = 0; x < this.Dimension; x++) {
	var square = this.Squares[x];
	
	square.PlaceTile(null, false);

	$(document).trigger('RackSquareTileChanged', [ this, square ]);
    }
}

Rack.prototype.MoveTile = function(tileXY, squareXY) {
    if (tileXY.y != -1 || squareXY.y != -1) {
	if (this.Game) {
	    this.Game.MoveTile(tileXY, squareXY);
	}
	
	return;
    }
    
    var square1 = this.Squares[tileXY.x];
    var square2 = this.Squares[squareXY.x];

    var tile = square1.Tile;
    square1.PlaceTile(null, false);
    square2.PlaceTile(tile, false);

    PlayAudio('audio4');
    
    $(document).trigger('RackSquareTileChanged', [ this, square1 ]);
    $(document).trigger('RackSquareTileChanged', [ this, square2 ]);
}

Rack.prototype.ReplenishRandomTiles = function() {
    var existingTiles = [];
    for (var x = 0; x < this.Dimension; x++) {
	var square = this.Squares[x];
	if (square.Tile) {
	    existingTiles.push(square.Tile);
	}
    }

    this.EmptyTiles();
    
    for (var x = 0; x < existingTiles.length; x++) {
	var square = this.Squares[x];
	square.PlaceTile(existingTiles[x], false);
	$(document).trigger('RackSquareTileChanged', [ this, square ]);
    }
    
    for (var x = existingTiles.length; x < (this.Dimension-1); x++) {
	var square = this.Squares[x];
	
	var tile = this.Game.LetterBag.GetRandomTile();
	if (!tile) return;
	
	square.PlaceTile(tile, false);
	
	$(document).trigger('RackSquareTileChanged', [ this, square ]);
    }
}

Rack.prototype.GenerateRandomTiles = function() {
    rack.EmptyTiles();

    for (var x = 0; x < (this.Dimension - 1); x++) {
	var square = this.Squares[x];
	
	var tile = this.Game.LetterBag.GetRandomTile();
	if (!tile) return;
	
	square.PlaceTile(tile, false);
	
	$(document).trigger('RackSquareTileChanged', [ this, square ]);
    }
    
    var square = this.Squares[this.Dimension - 1];
    if (square.Tile) {
	square.PlaceTile(null, false);
	
	$(document).trigger('RackSquareTileChanged', [ this, square ]);
    }
}

Rack.prototype.toString = function() {
    return "Rack toString(): " + this.Dimension;
}

function LetterBag(language)
{
    this.Tiles = [];
    this.Letters = [];

    var data = letterDistributions[language];
    if (!data) {
        alert('unsupported language: ' + language);
    }
    for (var i = 0; i < data.length; ++i) {
	var item = data[i];
	
	var tile = new Tile(item.Letter || Tile.prototype.BlankLetter, item.Score);
	this.Letters.push(tile);
	
	for (var n = 0; n < item.Count; ++n) {
	    var tile = new Tile(item.Letter || Tile.prototype.BlankLetter, item.Score);
	    this.Tiles.push(tile);
	}
    }
    
    this.Letters.sort(function(a,b) {
	var a = a.Letter || Tile.prototype.BlankLetter;
	var b = b.Letter || Tile.prototype.BlankLetter;

	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
    });
}

LetterBag.prototype.Shake = function()
{
    var count = this.Tiles.length;
    for (i = 0; i < count * 3; i++) {
        var a = Math.floor(Math.random() * count);
        var b = Math.floor(Math.random() * count);
        var tmp = this.Tiles[b];
        this.Tiles[b] = this.Tiles[a];
        this.Tiles[a] = tmp;
    }
}

LetterBag.prototype.GetRandomTile = function()
{
    this.Shake();
    
    for (var i = 0; i < this.Tiles.length; i++) {
        if (!this.Tiles[i].Placed) {
            return this.Tiles[i];
        }
    }
    return null;
}

function Game(language, board, rack) {
    
    this.Board = board;
    board.Game = this;
    
    this.Rack = rack;
    rack.Game = this;

    this.Language = language;
    this.LetterBag = new LetterBag(language);
}

Game.prototype.MoveTile = function(tileXY, squareXY) {
    if (tileXY.y == -1 && squareXY.y == -1) {
	this.Rack.MoveTile(tileXY, squareXY);
	return;
    }
    
    if (tileXY.y != -1 && squareXY.y != -1) {
	this.Board.MoveTile(tileXY, squareXY);
	return;
    }

    // RACK to BOARD
    if (tileXY.y == -1) {
	var square1 = this.Rack.Squares[tileXY.x];
	var square2 = this.Board.Squares[squareXY.x][squareXY.y];
	
	var tile = square1.Tile;
	square1.PlaceTile(null, false);
	square2.PlaceTile(tile, false);

	PlayAudio('audio4');
	
	$(document).trigger('RackSquareTileChanged', [ this.Rack, square1 ]);
	$(document).trigger('BoardSquareTileChanged', [ this.Board, square2 ]);
	
	return;
    }

    // BOARD to RACK
    if (squareXY.y == -1) {
	var square1 = this.Board.Squares[tileXY.x][tileXY.y];
	var square2 = this.Rack.Squares[squareXY.x];
	
	var tile = square1.Tile;
	square1.PlaceTile(null, false);
	square2.PlaceTile(tile, false);

	PlayAudio('audio4');
	
	$(document).trigger('BoardSquareTileChanged', [ this.Board, square1 ]);
	$(document).trigger('RackSquareTileChanged', [ this.Rack, square2 ]);
	
	return;
    }
}

Game.prototype.CommitMove = function() {
    var move = calculateMove(this.Board.Squares);

    console.log('move committed', move);

    if (move.error) {
        console.log('error: ' + move.error);
        return;
    }

    $(document).trigger('LockRack', [ this.Rack ]);
    $(document).trigger('CommitMove', [ this.Board ]);
}
    

Game.prototype.toString = function() {
    return "Game toString(): TODO ... ";
}

function UI() {
    // UI constructor

    this.CurrentlySelectedSquare = 0;
    this.Board = 0;
    this.Rack = 0;
    this.Game = 0;

    var ui = this;
    function uiCall(f) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            args.shift();                                   // remove event
            f.apply(ui, args);
        }
    }

    $(document)
        .bind('BoardReady', uiCall(ui.DrawBoard))
        .bind('BoardSquareTileChanged', uiCall(ui.UpdateBoardCell))
        .bind('BoardSquareStateChanged', uiCall(ui.UpdateCellState))
        .bind('RackReady', uiCall(ui.DrawRack))
        .bind('RackSquareTileChanged', uiCall(ui.UpdateRackCell))
        .bind('LetterTilesReady', uiCall(ui.DrawLetterTiles));
}

UI.prototype.UpdateCellState = function(board, square, state) {
    var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
    var td = document.getElementById(id).parentNode;
    $(td).removeClass("Invalid");
    $(td).removeClass("Valid");
    $(td).removeClass("ValidButWrongPlacement");
    
    if (state == 0) {
	$(td).addClass("Valid");
    } else if (state == 1) {
	$(td).addClass("Invalid");
    } else if (state == 2) {
	$(td).addClass("ValidButWrongPlacement");
    }
}
    
UI.prototype.UpdateBoardCell = function(board, square) {
    var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
    var td = document.getElementById(id).parentNode;
    if (td.hasChildNodes()) {
	while (td.childNodes.length >= 1) {
	    td.removeChild(td.firstChild);
	}
    }
    
    var div = document.createElement('div');
    td.appendChild(div);
    div.setAttribute('id', id);
    
    var a = document.createElement('a');
    div.appendChild(a);

    var ui = this;                                          // we're creating a bunch of callbacks below that close over the UI object

    if (square.Tile) {
	div.setAttribute('class', (square.TileLocked ? 'Tile Locked' : 'Tile Temp')
			 + (square.Tile.IsBlank ? " BlankLetter" : ""));
	
	if (!square.TileLocked) {
	    $(div).click(
		function () {
		    var id1 = $(this).attr("id");
		    var underscore1 = id1.indexOf("_");
		    var cross1 = id1.indexOf("x");
		    var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		    var y1 = parseInt(id1.substring(cross1 + 1), 10);
		    
		    if (ui.CurrentlySelectedSquare) {
			var sourceInRack = ui.CurrentlySelectedSquare.Y == -1;
			
			var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;

			var divz = document.getElementById(idSelected);

			$(divz).removeClass("Selected");
			
			if (x1 == ui.CurrentlySelectedSquare.X && y1 == ui.CurrentlySelectedSquare.Y) {
			    PlayAudio("audio1");
			    
			    ui.SetCurrentlySelectedSquareUpdateTargets(null);
			    return;
			}
		    }
		    
		    PlayAudio("audio3");
		    
		    ui.SetCurrentlySelectedSquareUpdateTargets(board.Squares[x1][y1]);
		    
		    $(this).addClass("Selected");
		}
	    );
	    
	    var doneOnce = false;
	    
	    $(div).draggable({
		revert: "invalid",
		opacity: 1,
		helper: "clone",
		start: function(event, jui) {
		    PlayAudio("audio3");
		    
		    if (ui.CurrentlySelectedSquare) {
			var sourceInRack = ui.CurrentlySelectedSquare.Y == -1;
			
			var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;

			var divz = document.getElementById(idSelected);
			$(divz).removeClass("Selected");
		    }
		    ui.SetCurrentlySelectedSquareUpdateTargets(null);
		    
		    $(this).css({ opacity: 0.5 });
		    
		    $(jui.helper).animate({'font-size' : '120%'}, 300);
		    
		    $(jui.helper).addClass("dragBorder");
		},
		
		drag: function(event, jui) {
		    if (!doneOnce) {
			$(jui.helper).addClass("dragBorder");
			
			doneOnce = true;
		    }
		},
		stop: function(event, jui) {
		    $(this).css({ opacity: 1 });

		    PlayAudio('audio5');
		}
	    });
	}
	
	var txt1 = document.createTextNode(square.Tile.Letter);
	var span1 = document.createElement('span');
	span1.setAttribute('class', 'Letter');
	span1.appendChild(txt1);
	a.appendChild(span1);

	var txt2 = document.createTextNode(square.Tile.Score);
	var span2 = document.createElement('span');
	span2.setAttribute('class', 'Score');
	span2.appendChild(txt2);
	a.appendChild(span2);
    } else {
	var middle = Math.floor(board.Dimension / 2);
	if (square.X == middle && square.Y == middle) {
	    div.setAttribute('class', "CenterStart");
	} else {
	    div.setAttribute('class', 'Empty');
	}
	
	$(div).click(
	    function () {
		var id1 = $(this).attr("id");
		var underscore1 = id1.indexOf("_");
		var cross1 = id1.indexOf("x");
		var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		var y1 = parseInt(id1.substring(cross1 + 1), 10);
		
		if (ui.CurrentlySelectedSquare) {
		    var sourceInRack = ui.CurrentlySelectedSquare.Y == -1;
		    
		    var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;
		    
		    var divz = document.getElementById(idSelected);

		    $(divz).removeClass("Selected");
		    
		    var XX = ui.CurrentlySelectedSquare.X;
		    var YY = ui.CurrentlySelectedSquare.Y;
		    
		    ui.SetCurrentlySelectedSquareUpdateTargets(null);
		    
		    board.MoveTile({ x: XX, y: YY },
                                   { x: x1, y: y1 });
		}
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		var id1 = $(jui.draggable).attr("id");
		var id2 = $(this).attr("id");
		
		var underscore1 = id1.indexOf("_");
		var cross1 = id1.indexOf("x");
		var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		var y1 = parseInt(id1.substring(cross1 + 1), 10);
		
		var underscore2 = id2.indexOf("_");
		var cross2 = id2.indexOf("x");
		var x2 = parseInt(id2.substring(underscore2 + 1, cross2), 10);
		var y2 = parseInt(id2.substring(cross2 + 1), 10);
		
		board.MoveTile({ x: x1, y: y1 },
                               { x: x2, y: y2 });
	    }
	});
	
	switch (square.Type) {
	case SquareType.Normal:
	    var span1 = document.createElement('span');
	    var txt1 = document.createTextNode(" ");
	    span1.appendChild(txt1);
	    a.appendChild(span1);
	    
	    break;
	case SquareType.DoubleWord:
	    
	    var middle = Math.floor(board.Dimension / 2);
	    if (square.X == middle && square.Y == middle) {
		var txt1 = document.createTextNode('\u2605');
		var span1 = document.createElement('span');
		span1.appendChild(txt1);
		a.appendChild(span1);
	    } else {
		var txt1 = document.createTextNode("DOUBLE");
		var txt2 = document.createTextNode("WORD");
		var txt3 = document.createTextNode("SCORE");
		
		
		var span1 = document.createElement('span');
		span1.appendChild(txt1);
		
		var span2 = document.createElement('span');
		span2.appendChild(txt2);
		
		var span3 = document.createElement('span');
		span3.appendChild(txt3);

		a.appendChild(span1);
		a.appendChild(document.createElement('br'));
		a.appendChild(span2);
		a.appendChild(document.createElement('br'));
		a.appendChild(span3);
	    }
	    break;
	case SquareType.TripleWord:
	    var span = document.createElement('span');
	    var txt1 = document.createTextNode("TRIPLE WORD SCORE");
	    span.appendChild(txt1);

	    a.appendChild(span);
	    break;
	case SquareType.DoubleLetter:
	    var span = document.createElement('span');
	    var txt1 = document.createTextNode("DOUBLE LETTER SCORE");
	    span.appendChild(txt1);

	    a.appendChild(span);
	    break;
	case SquareType.TripleLetter:
	    var span = document.createElement('span');
	    var txt1 = document.createTextNode("TRIPLE LETTER SCORE");
	    span.appendChild(txt1);

	    a.appendChild(span);
	    break;
	default:
	    break;
	}
    }
}
    
UI.prototype.DrawBoard = function(board) {
    var rootDiv = document.getElementById('board');
    var table = document.createElement('table');
    rootDiv.appendChild(table);
    
    for (var y = 0; y < board.Dimension; y++) {
	var tr = document.createElement('tr');
	table.appendChild(tr);
	
	for (var x = 0; x < board.Dimension; x++) {
	    var square = board.Squares[x][y];

	    var centerStart = false;
	    
	    var td = document.createElement('td');
	    tr.appendChild(td);
	    
	    var middle = Math.floor(board.Dimension / 2);
	    var halfMiddle = Math.ceil(middle / 2);
	    
	    if (square.Type == SquareType.TripleWord) {
		td.setAttribute('class', 'TripleWord');
	    } else if (square.Type == SquareType.DoubleWord) {
		if (x == middle && y == middle) {
		    centerStart = true;
		}
		
		td.setAttribute('class', 'DoubleWord');
	    } else if (square.Type == SquareType.DoubleLetter) {
		td.setAttribute('class', 'DoubleLetter');
	    } else if (square.Type == SquareType.TripleLetter) {
		td.setAttribute('class', 'TripleLetter');
	    } else {
		td.setAttribute('class', 'Normal');
	    }
	    
	    var div = document.createElement('div');
	    td.appendChild(div);
	    
	    var id = IDPrefix_Board_SquareOrTile + x + "x" + y;
	    div.setAttribute('id', id);
	    
	    var a = document.createElement('a');
	    div.appendChild(a);
	    
	    this.UpdateBoardCell(board, square);
	}
    }
}

UI.prototype.UpdateRackCell = function(rack, square) {
    var id = IDPrefix_Rack_SquareOrTile + square.X + "x" + square.Y;
    var td = document.getElementById(id).parentNode;
    if (td.hasChildNodes()) {
	while (td.childNodes.length >= 1) {
	    td.removeChild(td.firstChild);
	}
    }
    
    var div = document.createElement('div');
    td.appendChild(div);
    div.setAttribute('id', id);
    
    var a = document.createElement('a');
    div.appendChild(a);

    var ui = this;                                          // we're creating a bunch of callbacks below that close over the UI object

    if (square.Tile) {
	div.setAttribute('class', 'Tile Temp' + (square.Tile.IsBlank ? " BlankLetter" : "") + (rack.Locked ? " Locked" : ""));
	
	$(div).click(
	    function () {
		var id1 = $(this).attr("id");
		var underscore1 = id1.indexOf("_");
		var cross1 = id1.indexOf("x");
		var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		var y1 = parseInt(id1.substring(cross1 + 1), 10);
		
		if (ui.CurrentlySelectedSquare) {
		    var sourceInRack = ui.CurrentlySelectedSquare.Y == -1;
		    var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;
		    var divz = document.getElementById(idSelected);

		    $(divz).removeClass("Selected");
		    
		    if (sourceInRack
			&& x1 == ui.CurrentlySelectedSquare.X) {
			PlayAudio("audio1");
			
			ui.SetCurrentlySelectedSquareUpdateTargets(null);
			return;
		    }
		}
		
		PlayAudio("audio3");
		
		ui.SetCurrentlySelectedSquareUpdateTargets(rack.Squares[x1]);
		
		$(this).addClass("Selected");
	    }
	);

	var doneOnce = false;
	
	$(div).draggable({
	    revert: "invalid",
	    opacity: 1,
	    helper: "clone",
	    start: function(event, jui) {
		PlayAudio("audio3");
		
		if (ui.CurrentlySelectedSquare) {
		    var idSelected = IDPrefix_Rack_SquareOrTile + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;
		    var divz = document.getElementById(idSelected);
		    $(divz).removeClass("Selected");
		}
		ui.SetCurrentlySelectedSquareUpdateTargets(null);
		
		$(this).css({ opacity: 0.5 });
		
		$(jui.helper).animate({'font-size' : '120%'}, 300);
		
		$(jui.helper).addClass("dragBorder");
		
	    },
	    
	    drag: function(event, jui) {
		if (!doneOnce) {
		    $(jui.helper).addClass("dragBorder");
		    
		    doneOnce = true;
		}
	    },
	    stop: function(event, ui) {
		$(this).css({ opacity: 1 });

		PlayAudio('audio5');
	    }
	});
	
	var txt1 = document.createTextNode(square.Tile.Letter);
	var span1 = document.createElement('span');
	span1.setAttribute('class', 'Letter');
	span1.appendChild(txt1);
	a.appendChild(span1);

	var txt2 = document.createTextNode(square.Tile.Score);
	var span2 = document.createElement('span');
	span2.setAttribute('class', 'Score');
	span2.appendChild(txt2);
	a.appendChild(span2);
    } else {
	div.setAttribute('class', 'Empty');
	
	$(div).click(
	    function () {
		var id1 = $(this).attr("id");
		var underscore1 = id1.indexOf("_");
		var cross1 = id1.indexOf("x");
		var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		var y1 = parseInt(id1.substring(cross1 + 1), 10);

		if (ui.CurrentlySelectedSquare) {
		    var idSelected = IDPrefix_Rack_SquareOrTile + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;
		    var divz = document.getElementById(idSelected);

		    $(divz).removeClass("Selected");
		    
		    var XX = ui.CurrentlySelectedSquare.X;
		    var YY = ui.CurrentlySelectedSquare.Y;
		    
		    ui.SetCurrentlySelectedSquareUpdateTargets(null);
		    
		    rack.MoveTile({'x':XX, 'y':YY}, {'x':x1, 'y':y1});
		}
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		
		var id1 = $(jui.draggable).attr("id");
		var id2 = $(this).attr("id");
		
		var underscore1 = id1.indexOf("_");
		var cross1 = id1.indexOf("x");
		var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
		var y1 = parseInt(id1.substring(cross1 + 1), 10);
		
		var underscore2 = id2.indexOf("_");
		var cross2 = id2.indexOf("x");
		var x2 = parseInt(id2.substring(underscore2 + 1, cross2), 10);
		var y2 = parseInt(id2.substring(cross2 + 1), 10);
		
		rack.MoveTile({'x': x1, 'y': y1}, {'x': x2, 'y': y2});
	    }
	});
	
	switch (square.Type) {
	case SquareType.Normal:
	    var span1 = document.createElement('span');
	    var txt1 = document.createTextNode(" ");
	    span1.appendChild(txt1);
	    a.appendChild(span1);
	    break;
	default:
	    break;
	}
    }
}

UI.prototype.DrawRack = function(rack) {
    var rootDiv = document.getElementById('rack');
    var table = document.createElement('table');
    rootDiv.appendChild(table);
    
    var tr = document.createElement('tr');
    table.appendChild(tr);

    for (var x = 0; x < rack.Dimension; x++) {
	var square = rack.Squares[x];

	var td = document.createElement('td');
	tr.appendChild(td);

	td.setAttribute('class', 'Normal');
	
	var div = document.createElement('div');
	td.appendChild(div);
	
	var id = IDPrefix_Rack_SquareOrTile + square.X + "x" + square.Y;
	div.setAttribute('id', id);
	
	var a = document.createElement('a');
	div.appendChild(a);
	
	this.UpdateRackCell(rack, square);
    }
}

UI.prototype.DrawLetterTiles = function(game) {
    var rootDiv = document.getElementById('letters');
    
    if (rootDiv.hasChildNodes()) {
	while (rootDiv.childNodes.length >= 1) {
	    rootDiv.removeChild(rootDiv.firstChild);
	}
    }
    
    var table = document.createElement('table');
    rootDiv.appendChild(table);
    
    var tr = 0

    var counter = 9;
    for (var i = 0; i < game.LetterBag.Letters.length; i++) {
	var tile = game.LetterBag.Letters[i];
	if (tile.IsBlank) continue;

	counter++;
	if (counter > 9) {
	    tr = document.createElement('tr');
	    table.appendChild(tr);

	    counter = 0;
	}
	
	var td = document.createElement('td');
	td.setAttribute('class', 'Normal');
	tr.appendChild(td);
	
	var div = document.createElement('div');
	td.appendChild(div);

	var id = IDPrefix_Letters_SquareOrTile + i;
	div.setAttribute('id', id);
	
	var a = document.createElement('a');
	div.appendChild(a);

	div.setAttribute('class', 'Tile Temp' + (tile.IsBlank ? " BlankLetter" : ""));
	
	$(div).click(
	    function () {

		var id1 = $(this).attr("id");
		var underscore1 = id1.indexOf("_");
		var index = parseInt(id1.substring(underscore1 + 1), 10);

	        if (ui.CurrentlySelectedSquare) {
		    var sourceInRack = ui.CurrentlySelectedSquare.Y == -1;
		    
		    var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + ui.CurrentlySelectedSquare.X + "x" + ui.CurrentlySelectedSquare.Y;

		    var divz = document.getElementById(idSelected);

		    $(divz).addClass("Selected");
	        }
	    }
        );

        var txt1 = document.createTextNode(tile.Letter);
        var span1 = document.createElement('span');
        span1.setAttribute('class', 'Letter');
        span1.appendChild(txt1);
        a.appendChild(span1);

        var txt2 = document.createTextNode(tile.Score);
        var span2 = document.createElement('span');
        span2.setAttribute('class', 'Score');
        span2.appendChild(txt2);
        a.appendChild(span2);
    }
    
    var input = document.createElement('input');
    input.setAttribute('type', 'submit');
    input.setAttribute('value', 'Cancel');
    
    var buttonDiv = document.createElement('div');
    buttonDiv.setAttribute('style', 'background-color: #333333; width: auto; padding: 1em; padding-left: 2em; padding-right: 2em;');
    buttonDiv.appendChild(input);
    rootDiv.appendChild(buttonDiv);
}

UI.prototype.CleanupErrorLayer = function() {
    for (var y = 0; y < this.Board.Dimension; y++) {
	for (var x = 0; x < this.Board.Dimension; x++) {
	    var square = this.Board.Squares[x][y];
	    var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
	    var td = document.getElementById(id).parentNode;
	    $(td).removeClass("Invalid");
	    $(td).removeClass("Valid");
	    $(td).removeClass("ValidButWrongPlacement");
	}
    }
}

UI.prototype.SetCurrentlySelectedSquareUpdateTargets = function(square) {
    this.CurrentlySelectedSquare = square;
    
    for (var y = 0; y < this.Board.Dimension; y++) {
	for (var x = 0; x < this.Board.Dimension; x++) {
	    var squareTarget = this.Board.Squares[x][y];
	    if (!squareTarget.Tile) {
		var idSelected = IDPrefix_Board_SquareOrTile + squareTarget.X + "x" + squareTarget.Y;
		var divz = document.getElementById(idSelected);
		if (!this.CurrentlySelectedSquare) {
		    $(divz).removeClass("Targeted");
		} else {
		    $(divz).addClass("Targeted");
		}
	    }
	}
    }
    
    for (var x = 0; x < this.Rack.Dimension; x++) {
	var squareTarget = this.Rack.Squares[x];
	if (!squareTarget.Tile) {
	    var idSelected = IDPrefix_Rack_SquareOrTile + squareTarget.X + "x" + squareTarget.Y;
	    var divz = document.getElementById(idSelected);
	    if (!this.CurrentlySelectedSquare) {
		$(divz).removeClass("Targeted");
	    } else {
		$(divz).addClass("Targeted");
	    }
	}
    }
}


