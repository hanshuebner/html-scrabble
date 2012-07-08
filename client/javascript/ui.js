function triggerEvent(event, args) {
//    console.log('triggerEvent', event, args);
    $(document).trigger(event, args);
}

function UI(game) {
    // constructor

    var splitUrl = document.URL.match(/.*\/([0-9a-f]+)$/);
    if (splitUrl) {
        this.gameKey = splitUrl[1];
        this.playerKey = $.cookie(this.gameKey);
    } else {
        console.log('cannot parse url');
    }

    var ui = this;
    $.get('/game/' + this.gameKey, function (gameData, err) {
        gameData = thaw(gameData, { Board: Board, Tile: Tile, Square: Square, Rack: Rack });
        console.log('got game data', gameData);

        ui.board = gameData.board;
        for (var i in gameData.players) {
            var player = gameData.players[i];
            if (player.rack) {
                ui.rack = player.rack;
            }
        }

        ui.drawBoard();
        ui.drawRack();

        ui.socket = io.connect();
        ui.socket.on('join', function (data) {
            console.log('join', data);
        });
        ui.socket.on('leave', function (data) {
            console.log('leave', data);
        });
        ui.socket.on('turn', function (data) {
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
            .bind('SquareChanged', uiCall(ui.updateSquare))
            .bind('Refresh', uiCall(ui.refresh))
            .bind('RefreshRack', uiCall(ui.refreshRack))
            .bind('RefreshBoard', uiCall(ui.refreshBoard));

        ['CommitMove'].forEach(function (action) {
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
            return this.board.squares[match[2]][match[3]];
        } else {
            return this.rack.squares[match[2]];
        }
    } else {
        throw "cannot parse id " + id;
    }
}

UI.prototype.updateSquareState = function(board, square, state) {
    var id = 'Board_' + square.x + "x" + square.y;
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

UI.prototype.updateSquare = function(square) {
    if (square.owner == this.rack) {
        this.updateRackSquare(square);
    } else if (square.owner == this.board) {
        this.updateBoardSquare(square);
    } else {
        console.log('could not identify owner of square', square);
    }
}

UI.prototype.updateBoardSquare = function(square) {
    var div = DIV({ id: square.id });
    var ui = this;                                          // we're creating a bunch of callbacks below that close over the UI object

    if (square.tile) {
        $(div).addClass('Tile')
        if (square.tileLocked) {
            $(div).addClass('Locked');
        } else {
            $(div).addClass('Temp');
        }
        if (square.tile.isBlank) {
            $(div).addClass('BlankLetter');
        }

	if (!square.tileLocked) {
	    $(div).click(
		function () {
		    if (ui.currentlySelectedSquare) {
			if (ui.currentlySelectedSquare == square) {
			    ui.playAudio("audio1");
			    ui.selectSquare(null);
			    return;
			}
		    }
		    ui.playAudio("audio3");
		    ui.selectSquare(square);
		}
	    );
	    
	    var doneOnce = false;
	    
	    $(div).draggable({
		revert: "invalid",
		opacity: 1,
		helper: "clone",
		start: function(event, jui) {
		    ui.playAudio("audio3");
		    ui.selectSquare(null);
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
		    ui.playAudio('audio5');
		}
	    });
	}

        div.appendChild(A(null,
                          SPAN({ 'class': 'Letter' }, square.tile.letter),
                          SPAN({ 'class': 'Score' }, square.tile.score)));
    } else {
	if (square.x == 7 && square.y == 7) {
	    div.setAttribute('class', "CenterStart");
	} else {
	    div.setAttribute('class', 'Empty');
	}
	
	$(div).click(
	    function () {
		if (ui.currentlySelectedSquare) {
                    ui.moveTile(ui.currentlySelectedSquare, square);
		    ui.selectSquare(null);
		}
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.playAudio('audio4');
                ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	    }
	});
	
	switch (square.type) {
	case 'Normal':
            div.appendChild(A(null, SPAN(null, " ")));
	    break;
	case 'DoubleWord':
	    if (square.x == 7 && square.y == 7) {
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
    
UI.prototype.drawBoard = function() {
    var board = this.board;

    $('#board').append(TABLE(null,
                             map(function (y) {
                                 return TR(null,
                                           map(function (x) {
	                                       var square = board.squares[x][y];
	                                       var id = 'Board_' + x + "x" + y;
                                               square.id = id;
                                               return TD({ 'class': square.type },
	                                                 DIV({ id: id },
                                                             A()));
                                           }, range(board.Dimension)));
                             }, range(board.Dimension))));
    this.refreshBoard();
}

UI.prototype.updateRackSquare = function(square) {
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

    console.log('UpdateRackSquare, square', square);
    if (square.tile) {
        $(div).addClass('Tile');
        if (square.tile.isBlank) {
            $(div).addClass('BlankLetter');
        }
        $(div).addClass(this.rack.locked ? 'Locked' : 'Temp');

        if (!this.rack.locked) {
	    $(div).click(
	        function () {
		    if (ui.currentlySelectedSquare) {
		        if (ui.currentlySelectedSquare == square) {
			    ui.playAudio("audio1");
			    ui.selectSquare(null);
			    return;
		        }
		    }
		    ui.playAudio("audio3");
		    ui.selectSquare(square);
                }
	    );

	    var doneOnce = false;
	    
	    $(div).draggable({
	        revert: "invalid",
	        opacity: 1,
	        helper: "clone",
	        start: function(event, jui) {
		    ui.playAudio("audio3");
		    ui.selectSquare(null);
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
		    ui.playAudio('audio5');
	        }
	    });
        }
	
        a.appendChild(SPAN({ 'class': 'Letter' },
                           square.tile.letter));
        a.appendChild(SPAN({ 'class': 'Score' },
                           square.tile.score));
    } else {
	div.setAttribute('class', 'Empty');
	
	$(div).click(
	    function () {
		if (ui.currentlySelectedSquare) {
		    ui.moveTile(ui.currentlySelectedSquare, square);
		    ui.selectSquare(null);
                }
	    }
	);

	$(div).droppable({
	    hoverClass: "dropActive",
	    drop: function(event, jui) {
		ui.playAudio('audio4');
                ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	    }
	});
	
	switch (square.type) {
	case 'Normal':
	    a.appendChild(SPAN(null, " "));
	    break;
	default:
	    break;
	}
    }
}

UI.prototype.drawRack = function() {
    var rack = this.rack;

    $('#rack')
        .append(TABLE(null,
                      TR(null,
                         map(function (x) {
                             var id = 'Rack_' + x;
                             rack.squares[x].id = id;
                             return TD({ 'class': 'Normal' },
                                       DIV({ id: id }, A()));
                         }, range(8)))));
    var ui = this;
    forEach(range(8), function (x) {
	ui.updateRackSquare(rack.squares[x]);
    });
}

UI.prototype.refreshRack = function() {
    var rack = this.rack;
    for (var x = 0; x < rack.dimension; x++) {

	this.updateRackSquare(rack.squares[x]);
    }
}

UI.prototype.refreshBoard = function() {
    var board = this.board;
    for (var y = 0; y < board.Dimension; y++) {
	for (var x = 0; x < board.Dimension; x++) {
            this.updateBoardSquare(board.squares[x][y]);
	}
    }
}

UI.prototype.refresh = function () {
    this.refreshRack();
    this.refreshBoard();
}

UI.prototype.selectSquare = function(square) {

    if (this.currentlySelectedSquare) {
        $('#' + this.currentlySelectedSquare.id).removeClass('Selected');
    }

    this.currentlySelectedSquare = square;

    if (this.currentlySelectedSquare) {
        $('#' + this.currentlySelectedSquare.id).addClass('Selected');
    }

    $('#board td').removeClass('Targeted');

    // selecting the target first does not yet work.
    if (square && !square.tile) {
        console.log('SelectSquare - ' + square.x + '/' + square.y);
        $('#' + 'Board_' + square.x + "x" + square.y)
            .addClass('Targeted');
    }
}

UI.prototype.moveTile = function(fromSquare, toSquare) {
    var tile = fromSquare.tile;
    fromSquare.placeTile(null);
    toSquare.placeTile(tile);
}

UI.prototype.playAudio = function(id) {
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

UI.prototype.serverCommand = function(command, args) {
    $.ajax({
        type: 'PUT',
        url: '/game/' + this.gameKey,
        data: { command: command,
                arguments: args }});
}    

UI.prototype.CommitMove = function() {
    var move = CalculateMove(this.board.squares);
    if (move.error) {
        alert(move.error);
        return;
    }
    this.serverCommand('placeTiles', move.tilesPlaced);
}

