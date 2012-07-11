function triggerEvent(event, args) {
//    console.log('triggerEvent', event, args);
    $(document).trigger(event, args);
}

var PrototypeMap = { Board: Board, Tile: Tile, Square: Square, Rack: Rack };

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
        gameData = thaw(gameData, PrototypeMap);
        console.log('gameData', gameData);

        ui.board = gameData.board;
        ui.players = gameData.players;
        var playerNumber = 0;
        $('#scoreboard')
            .append(TABLE(null,
                          gameData.players.map(function(player) {
                              if (player.rack) {
                                  ui.rack = player.rack;
                                  ui.boardLocked(!player.yourTurn);
                                  ui.playerNumber = playerNumber;
                              }
                              playerNumber++;
                              return TR(null,
                                        TD({ 'class': 'name' }, player.rack ? "You" : player.name),
                                        player.scoreElement = TD({ 'class': 'score' }, player.score));
                          })));

        ui.drawBoard();
        ui.drawRack();

        function appendTurnToLog(turn) {
            player = ui.players[turn.player];
            $('#log')
                .append(DIV({ 'class': 'moveScore' },
                            DIV({ 'class': 'score' },
                                SPAN({ 'class': 'playerName' }, player.name),
                                SPAN({ 'class': 'score' }, turn.move.score)),
                            turn.move.words.map(function (word) {
                                return DIV({ 'class': 'wordScore' },
                                           SPAN({ 'class': 'word' }, word.word),
                                           SPAN({ 'class': 'score' }, word.score))
                            })))
                .animate({ scrollTop: $('#log').prop('scrollHeight') }, 1000);
        }

        function processTurnScore(turn) {
            player = ui.players[turn.player];
            player.score += turn.move.score;
            $(player.scoreElement).text(player.score);
        }

        function placeTurnTiles(turn) {
            for (var i in turn.placements) {
                var placement = turn.placements[i];
                ui.board.squares[placement.x][placement.y].placeTile(new Tile(placement.letter, placement.score), true);
            }
        }

        gameData.turns.map(appendTurnToLog);

        ui.socket = io.connect();
        ui.socket.emit('join', { gameKey: ui.gameKey });
        ui.socket.on('join', function (data) {
            console.log('join', data);
        });
        ui.socket.on('leave', function (data) {
            console.log('leave', data.command);
        });
        ui.socket.on('turn', function (turn) {
            console.log('turn', turn);
            appendTurnToLog(turn);
            processTurnScore(turn);
            if (turn.player != ui.playerNumber) {
                placeTurnTiles(turn);
            }
            if (turn.nextTurn == ui.playerNumber) {
                ui.boardLocked(false);
            }
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

        ['CommitMove', 'Shuffle'].forEach(function (action) {
            var button = BUTTON({ id: action }, action)
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
        if (square.tile.isBlank()) {
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
                          SPAN({ 'class': 'Letter' }, square.tile.letter ? square.tile.letter : ''),
                          SPAN({ 'class': 'Score' }, square.tile.score ? square.tile.score : '')));
    } else {
	if (square.x == 7 && square.y == 7) {
	    div.setAttribute('class', "CenterStart");
	} else {
	    div.setAttribute('class', 'Empty');
	}

        if (!ui.boardLocked()) {
	    $(div)
                .click(function () {
		    if (ui.currentlySelectedSquare) {
                        ui.moveTile(ui.currentlySelectedSquare, square);
		        ui.selectSquare(null);
		    }
	        })
                .droppable({
	            hoverClass: "dropActive",
	            drop: function(event, jui) {
		        ui.playAudio('audio4');
                        ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	            }
	        });
        }
	
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

    if (square.tile) {
        $(div).addClass('Tile');
        if (square.tile.isBlank()) {
            $(div).addClass('BlankLetter');
        }
	$(div)
            .addClass('Temp')
            .click(
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
	
        a.appendChild(SPAN({ 'class': 'Letter'  },
                           square.tile.letter ? square.tile.letter : ''));
        a.appendChild(SPAN({ 'class': 'Score' },
                           square.tile.score ? square.tile.score : ''));
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
    for (var x = 0; x < rack.Dimension; x++) {
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
    if (!this.boardLocked()) {
        setTimeout(function () { ui.updateGameStatus() }, 100);
    }
}

UI.prototype.updateGameStatus = function() {
    var move = calculateMove(this.board.squares);
    $('#move').empty();
    if (move.error) {
        $('#move')
            .append(move.error);
        $('#CommitMove').attr('disabled', 'disabled');
    } else {
        $('#move')
            .append(DIV(null, "score: " + move.score));
        move.words.forEach(function (word) {
            $('#move')
                .append(DIV(null, word.word + " " + word.score));
        });
        $('#CommitMove').removeAttr('disabled');
    }
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

UI.prototype.serverCommand = function(command, args, success) {
    $.ajax({
        type: 'PUT',
        url: '/game/' + this.gameKey,
        contentType: 'application/json',
        data: JSON.stringify({ command: command,
                               arguments: args }),
        success: success });
}

UI.prototype.boardLocked = function(newVal) {
    if (arguments.length > 0) {
        boardLocked = newVal;
        this.refreshBoard();
        console.log('board lock:', boardLocked);
    }
    return boardLocked;
}

UI.prototype.CommitMove = function() {
    var ui = this;
    var move = calculateMove(this.board.squares);
    if (move.error) {
        alert(move.error);
        return;
    }
    $('#move').empty();
    $('#CommitMove').attr('disabled', 'disabled');
    ui.boardLocked(true);
    for (var i = 0; i < move.tilesPlaced.length; i++) {
        var tilePlaced = move.tilesPlaced[i];
        var square = ui.board.squares[tilePlaced.x][tilePlaced.y];
        square.tileLocked = true;
        ui.updateBoardSquare(square);
    }
    console.log(move.tilesPlaced);
    ui.serverCommand('makeMove',
                     move.tilesPlaced,
                     function (data) {
                         data = thaw(data, PrototypeMap);
                         if (!data.newTiles) {
                             console.log('expected new tiles, got ' + data);
                         }
                         ui.rack.squares.forEach(function (square) {
                             if (data.newTiles.length) {
                                 if (!square.tile) {
                                     square.placeTile(data.newTiles.pop());
                                     ui.updateRackSquare(square);
                                 }
                             }
                         });
                     });
}

UI.prototype.Shuffle = function() {
    function random(i) {
        return Math.floor(Math.random() * i);
    }
    for (var i = 0; i < 16; i++) {
        var from = this.rack.squares[random(8)];
        var to = this.rack.squares[random(8)];
        var tmp = from.tile;
        from.tile = to.tile;
        to.tile = tmp;
    }
    this.refreshRack();
}