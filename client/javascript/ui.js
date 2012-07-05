function triggerEvent(event, args) {
    console.log('triggerEvent ' + event + ' ' + args[0], '=>', args);
    $(document).trigger(event, args);
}

function UI(board, rack) {
    // constructor

    this.Board = board;
    this.Rack = rack;

    this.DrawBoard();
    this.DrawRack();

    var ui = this;

    function uiCall(f) {
        return function() {
            var args = Array.prototype.slice.call(arguments);
            args.shift();                                   // remove event
            f.apply(ui, args);
        }
    }

    $(document)
        .bind('BoardSquareChanged', uiCall(ui.UpdateBoardCell))
        .bind('BoardSquareStateChanged', uiCall(ui.UpdateCellState))
        .bind('RackSquareChanged', uiCall(ui.UpdateRackCell))
        .bind('RefreshRack', uiCall(ui.RefreshRack))
        .bind('RefreshBoard', uiCall(ui.RefreshBoard));
}

UI.prototype.idToSquare = function(id) {
    var match = id.match(/(Board|Rack)_(\d+)x?(\d*)/);
    if (match) {
        if (match[1] == 'Board') {
            return this.Board.Squares[match[2]][match[3]];
        } else {
            return this.Rack.Squares[match[2]];
        }
    } else {
        throw "cannot parse id " + id;
    }
}

UI.prototype.UpdateCellState = function(board, square, state) {
    var id = 'Board_' + square.X + "x" + square.Y;
    var td = document.getElementById(id).parentNode;
    $(td).removeClass("Invalid Valid ValidButWrongPlacement");

    switch (state) {
    case 0:
	$(td).addClass("Valid");
        break;
    case 1:
	$(td).addClass("Invalid");
        break;
    case 2:
	$(td).addClass("ValidButWrongPlacement");
        break;
    }
}
    
UI.prototype.UpdateBoardCell = function(square) {
    var div = DIV({ id: square.id });
    var ui = this;                                          // we're creating a bunch of callbacks below that close over the UI object

    if (square.Tile) {
        $(div).addClass('Tile')
        if (square.TileLocked) {
            $(div).addClass('Locked');
        } else {
            $(div).addClass('Temp');
        }
        if (square.Tile.IsBlank) {
            $(div).addClass('BlankLetter');
        }

	if (!square.TileLocked) {
	    $(div).click(
		function () {
		    if (ui.CurrentlySelectedSquare) {
			if (ui.CurrentlySelectedSquare == square) {
			    ui.PlayAudio("audio1");
			    ui.SelectSquare(null);
			    return;
			}
		    }
		    ui.PlayAudio("audio3");
		    ui.SelectSquare(square);
		}
	    );
	    
	    var doneOnce = false;
	    
	    $(div).draggable({
		revert: "invalid",
		opacity: 1,
		helper: "clone",
		start: function(event, jui) {
		    ui.PlayAudio("audio3");
		    
		    ui.SelectSquare(null);
		    
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

		    ui.PlayAudio('audio5');
		}
	    });
	}

        div.appendChild(A(null,
                          SPAN({ 'class': 'Letter' }, square.Tile.Letter),
                          SPAN({ 'class': 'Score' }, square.Tile.Score)));
    } else {
	var middle = Math.floor(board.Dimension / 2);
	if (square.X == middle && square.Y == middle) {
	    div.setAttribute('class', "CenterStart");
	} else {
	    div.setAttribute('class', 'Empty');
	}
	
	$(div).click(
	    function () {
		if (ui.CurrentlySelectedSquare) {
		    ui.SelectSquare(null);
                    triggerEvent('MoveTile', ['Board', ui.CurrentlySelectedSquare, square]);
		}
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.PlayAudio('audio4');
                triggerEvent('MoveTile', ['Board', ui.idToSquare($(jui.draggable).attr("id")), square]);
	    }
	});
	
	switch (square.Type) {
	case SquareType.Normal:
            div.appendChild(A(null, SPAN(null, " ")));
	    break;
	case SquareType.DoubleWord:
	    var middle = Math.floor(board.Dimension / 2);
	    if (square.X == middle && square.Y == middle) {
                div.appendChild(A(null, SPAN(null, '\u2605')));
	    } else {
                div.appendChild(A(null, SPAN(null, "DOUBLE WORD SCORE")));
	    }
	    break;
	case SquareType.TripleWord:
            div.appendChild(A(null, SPAN(null, "TRIPLE WORD SCORE")));
	    break;
	case SquareType.DoubleLetter:
            div.appendChild(A(null, SPAN(null, "DOUBLE LETTER SCORE")));
	    break;
	case SquareType.TripleLetter:
            div.appendChild(A(null, SPAN(null, "TRIPLE LETTER SCORE")));
	}
    }

    $('#' + square.id)
        .parent()
        .empty()
        .append(div);
}
    
UI.prototype.DrawBoard = function() {

    var rootDiv = document.getElementById('board');
    var table = document.createElement('table');
    rootDiv.appendChild(table);
    
    for (var y = 0; y < board.Dimension; y++) {
	var tr = document.createElement('tr');
	table.appendChild(tr);
	
	for (var x = 0; x < board.Dimension; x++) {
	    var square = board.Squares[x][y];
	    
	    var td = document.createElement('td');
	    tr.appendChild(td);
	    
	    var middle = Math.floor(board.Dimension / 2);
	    var halfMiddle = Math.ceil(middle / 2);
	    
	    if (square.Type == SquareType.TripleWord) {
		td.setAttribute('class', 'TripleWord');
	    } else if (square.Type == SquareType.DoubleWord) {
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
	    
	    var id = 'Board_' + x + "x" + y;
	    div.setAttribute('id', id);
	    
	    var a = document.createElement('a');
	    div.appendChild(a);

            square.id = id;
	    
	    this.UpdateBoardCell(square);
	}
    }
}

UI.prototype.UpdateRackCell = function(square) {
    var id = square.id;
    var div = document.createElement('div');
    $('#' + id)
        .parent()
        .empty()
        .append(div);
    
    div.setAttribute('id', id);
    
    var a = document.createElement('a');
    div.appendChild(a);

    var ui = this;                                          // we're creating a bunch of callbacks below that close over the UI object

    if (square.Tile) {
        $(div).addClass('Tile');
        if (square.Tile.IsBlank) {
            $(div).addClass('BlankLetter');
        }
        $(div).addClass(this.Rack.Locked ? 'Locked' : 'Temp');

        if (!this.Rack.Locked) {
	    $(div).click(
	        function () {
		    if (ui.CurrentlySelectedSquare) {
		        if (ui.CurrentlySelectedSquare == square) {
			    ui.PlayAudio("audio1");
			    ui.SelectSquare(null);
			    return;
		        }
		    }
		    ui.PlayAudio("audio3");
		    ui.SelectSquare(square);
                }
	    );

	    var doneOnce = false;
	    
	    $(div).draggable({
	        revert: "invalid",
	        opacity: 1,
	        helper: "clone",
	        start: function(event, jui) {
		    ui.PlayAudio("audio3");

		    ui.SelectSquare(null);

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
	
        a.appendChild(SPAN({ 'class': 'Letter' },
                           square.Tile.Letter));
        a.appendChild(SPAN({ 'class': 'Score' },
                           square.Tile.Score));
    } else {
	div.setAttribute('class', 'Empty');
	
	$(div).click(
	    function () {
		if (ui.CurrentlySelectedSquare) {
		    ui.SelectSquare(null);
		    triggerEvent('MoveTile', ['Rack', ui.CurrentlySelectedSquare, square]);
                }
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.PlayAudio('audio4');
                triggerEvent('MoveTile', ['Rack', ui.idToSquare($(jui.draggable).attr("id")), square]);
	    }
	});
	
	switch (square.Type) {
	case SquareType.Normal:
	    a.appendChild(SPAN(null, " "));
	    break;
	default:
	    break;
	}
    }
}

UI.prototype.DrawRack = function() {
    var rack = this.Rack;

    $('#rack')
        .append(TABLE(null,
                      TR(null,
                         map(function (x) {
                             var id = 'Rack_' + x;
                             rack.Squares[x].id = id;
                             return TD({ 'class': 'Normal' },
                                       DIV({ id: id }, A()));
                         }, range(8)))));
    var ui = this;
    forEach(range(8), function (x) {
	ui.UpdateRackCell(rack.Squares[x]);
    });
}

UI.prototype.RefreshRack = function(rack) {
    for (var x = 0; x < rack.Dimension; x++) {
	var square = rack.Squares[x];

	this.UpdateRackCell(square);
    }
}

UI.prototype.RefreshBoard = function(board) {
    for (var y = 0; y < board.Dimension; y++) {
	for (var x = 0; x < board.Dimension; x++) {
            this.UpdateBoardCell(board.Squares[x][y]);
	}
    }
}

UI.prototype.SelectSquare = function(square) {

    console.log('SelectSquare', square);

    if (this.CurrentlySelectedSquare) {
        $('#' + this.CurrentlySelectedSquare.id).removeClass('Selected');
    }

    this.CurrentlySelectedSquare = square;

    if (this.CurrentlySelectedSquare) {
        $('#' + this.CurrentlySelectedSquare.id).addClass('Selected');
    }

    $('#board td').removeClass('Targeted');

    if (square && !square.Tile) {
        console.log('SelectSquare - ' + square.X + '/' + square.Y);
        $('#' + 'Board_' + square.X + "x" + square.Y)
            .addClass('Targeted');
    }
}


UI.prototype.PlayAudio = function(id) {
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

