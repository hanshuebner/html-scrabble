function triggerEvent(event, args) {
    console.log('triggerEvent', event, args);
    $(document).trigger(event, args);
}

function UI(game) {
    // constructor

    var splitUrl = document.URL.match(/.*\/([0-9a-f]+)$/);
    if (splitUrl) {
        this.GameKey = splitUrl[1];
        this.PlayerKey = $.cookie(this.GameKey);
    } else {
        console.log('cannot parse url');
    }

    var ui = this;
    $.get('/game/' + this.GameKey, function (gameData, err) {
        gameData = thaw(gameData, { Board: Board, Tile: Tile, Square: Square, Rack: Rack });
        console.log('got game data', gameData);

        ui.Board = gameData.board;
        ui.Rack = new Rack();

        ui.DrawBoard();
        ui.DrawRack();

        ui.Socket = io.connect();
        ui.Socket.on('join', function (data) {
            console.log('join', data);
        });
        ui.Socket.on('leave', function (data) {
            console.log('leave', data);
        });
        ui.Socket.on('turn', function (data) {
            console.log('turn', data);
        });

        function uiCall(f) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                args.shift();                                   // remove event
                f.apply(ui, args);
            }
        }

        $(document)
            .bind('SquareChanged', uiCall(ui.UpdateSquare))
            .bind('Refresh', uiCall(ui.Refresh))
            .bind('RefreshRack', uiCall(ui.RefreshRack))
            .bind('RefreshBoard', uiCall(ui.RefreshBoard));

        ['CommitMove', 'OpenForMove', 'ReplenishRandomTiles'].forEach(function (action) {
            var button = BUTTON(null, action)
            $(button).bind('click', uiCall(ui[action]));
            $('#buttons').append(button);
        });
    });
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

UI.prototype.UpdateSquareState = function(board, square, state) {
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

UI.prototype.UpdateSquare = function(square) {
    if (square.Owner == this.Rack) {
        this.UpdateRackSquare(square);
    } else if (square.Owner == this.Board) {
        this.UpdateBoardSquare(square);
    } else {
        console.log('could not identify owner of square', square);
    }
}

UI.prototype.UpdateBoardSquare = function(square) {
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
		    $(jui.helper)
                        .animate({'font-size' : '120%'}, 300)
                        .addClass("dragBorder");
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
	if (square.X == 7 && square.Y == 7) {
	    div.setAttribute('class', "CenterStart");
	} else {
	    div.setAttribute('class', 'Empty');
	}
	
	$(div).click(
	    function () {
		if (ui.CurrentlySelectedSquare) {
                    ui.MoveTile(ui.CurrentlySelectedSquare, square);
		    ui.SelectSquare(null);
		}
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.PlayAudio('audio4');
                ui.MoveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	    }
	});
	
	switch (square.Type) {
	case 'Normal':
            div.appendChild(A(null, SPAN(null, " ")));
	    break;
	case 'DoubleWord':
	    if (square.X == 7 && square.Y == 7) {
                div.appendChild(A(null, SPAN(null, '\u2605')));
	    } else {
                div.appendChild(A(null, SPAN(null, "DOUBLE WORD SCORE")));
	    }
	    break;
	case 'TripleWord':
            div.appendChild(A(null, SPAN(null, "TRIPLE WORD SCORE")));
	    break;
	case 'DoubleLetter':
            div.appendChild(A(null, SPAN(null, "DOUBLE LETTER SCORE")));
	    break;
	case 'TripleLetter':
            div.appendChild(A(null, SPAN(null, "TRIPLE LETTER SCORE")));
	}
    }

    $('#' + square.id)
        .parent()
        .empty()
        .append(div);
}
    
UI.prototype.DrawBoard = function() {
    var board = this.Board;

    $('#board').append(TABLE(null,
                             map(function (y) {
                                 return TR(null,
                                           map(function (x) {
	                                       var square = board.Squares[x][y];
	                                       var id = 'Board_' + x + "x" + y;
                                               square.id = id;
                                               return TD({ 'class': square.Type },
	                                                 DIV({ id: id },
                                                             A()));
                                           }, range(board.Dimension)));
                             }, range(board.Dimension))));
    this.RefreshBoard();
}

UI.prototype.UpdateRackSquare = function(square) {
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
		    $(jui.helper)
                        .animate({'font-size' : '120%'}, 300)
                        .addClass("dragBorder");
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
		    ui.MoveTile(ui.CurrentlySelectedSquare, square);
		    ui.SelectSquare(null);
                }
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.PlayAudio('audio4');
                ui.MoveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	    }
	});
	
	switch (square.Type) {
	case 'Normal':
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
	ui.UpdateRackSquare(rack.Squares[x]);
    });
}

UI.prototype.RefreshRack = function() {
    var rack = this.Rack;
    for (var x = 0; x < rack.Dimension; x++) {

	this.UpdateRackSquare(rack.Squares[x]);
    }
}

UI.prototype.RefreshBoard = function() {
    var board = this.Board;
    for (var y = 0; y < board.Dimension; y++) {
	for (var x = 0; x < board.Dimension; x++) {
            this.UpdateBoardSquare(board.Squares[x][y]);
	}
    }
}

UI.prototype.Refresh = function () {
    this.RefreshRack();
    this.RefreshBoard();
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

    // selecting the target first does not yet work.
    if (square && !square.Tile) {
        console.log('SelectSquare - ' + square.X + '/' + square.Y);
        $('#' + 'Board_' + square.X + "x" + square.Y)
            .addClass('Targeted');
    }
}

UI.prototype.MoveTile = function(fromSquare, toSquare) {
    var tile = fromSquare.Tile;
    fromSquare.PlaceTile(null);
    toSquare.PlaceTile(tile);
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

UI.prototype.CommitMove = function() {
    this.Game.CommitMove();
}

UI.prototype.ReplenishRandomTiles = function() {
    this.Rack.ReplenishRandomTiles();
}

UI.prototype.OpenForMove = function() {
    this.Rack.Locked = false;
    this.RefreshRack();
}


