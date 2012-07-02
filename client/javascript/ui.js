function triggerEvent(event, args) {
    $(document).trigger(event, args);
}

function UI() {
    // constructor

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
        .bind('LetterTilesReady', uiCall(ui.DrawLetterTiles))
        .bind('RefreshRack', uiCall(ui.RefreshRack))
        .bind('RefreshBoard', uiCall(ui.RefreshBoard));
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
			    ui.PlayAudio("audio1");
			    
			    ui.SetCurrentlySelectedSquareUpdateTargets(null);
			    return;
			}
		    }
		    
		    ui.PlayAudio("audio3");
		    
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
		    ui.PlayAudio("audio3");
		    
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
                    console.log('draggable stop');
		    $(this).css({ opacity: 1 });

		    ui.PlayAudio('audio5');
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
		ui.PlayAudio('audio4');

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
	div.setAttribute('class', 'Tile' + (square.Tile.IsBlank ? " BlankLetter" : "") + (rack.Locked ? " Locked" : " Temp"));

        if (!rack.Locked) {
	    
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
			    ui.PlayAudio("audio1");
			    
			    ui.SetCurrentlySelectedSquareUpdateTargets(null);
			    return;
		        }
		    }
		    
		    ui.PlayAudio("audio3");
		    
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
		    ui.PlayAudio("audio3");
		    
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
	        stop: function(event, jui) {
                    console.log('draggable stop');
		    $(this).css({ opacity: 1 });

		    ui.PlayAudio('audio5');
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
		ui.PlayAudio('audio4');
		
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

UI.prototype.RefreshRack = function(rack) {
    for (var x = 0; x < rack.Dimension; x++) {
	var square = rack.Squares[x];

	this.UpdateRackCell(rack, square);
    }
}

UI.prototype.RefreshBoard = function(board) {
    for (var y = 0; y < board.Dimension; y++) {
	for (var x = 0; x < board.Dimension; x++) {
            this.UpdateBoardCell(board, board.Squares[x][y]);
	}
    }
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


UI.prototype.PlayAudio = function(id) {
    var audio = document.getElementById(id);

    console.log('PlayAudio:', id);
    
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

