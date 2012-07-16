function triggerEvent(event, args) {
//    console.log('triggerEvent', event, args);
    $(document).trigger(event, args);
}

function joinProse(array)
{
    var length = array.length;
    switch (length) {
    case 0:
        return "";
    case 1:
        return array[0];
    default:
        return _.reduce(array.slice(1, length - 1), function (accu, word) { return accu + ", " + word }, array[0]) + " and " + array[length - 1];
    }
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

        ui.swapRack = new Rack(7);
        ui.swapRack.tileCount = 0;
        ui.board = gameData.board;
        ui.board.tileCount = 0;
        ui.legalLetters = gameData.legalLetters;
        ui.players = gameData.players;
        var playerNumber = 0;
        $('#scoreboard')
            .append(TABLE(null,
                          gameData.players.map(function(player) {
                              if (player.rack) {
                                  ui.rack = player.rack;
                                  ui.rack.tileCount = _.reduce(player.rack.squares,
                                                               function(accu, square) {
                                                                   if (square.tile) {
                                                                       accu++;
                                                                   }
                                                                   return accu;
                                                               },
                                                               0);
                                  ui.playerNumber = playerNumber;
                              }
                              playerNumber++;
                              return TR(null,
                                        TD({ 'class': 'name' }, player.rack ? "You" : player.name),
                                        player.scoreElement = TD({ 'class': 'score' }, player.score));
                          })))
            .append(DIV({ id: 'letterbagStatus' }));

        function displayRemainingTileCount(count) {
            if (count > 0) {
                $('#letterbagStatus')
                    .empty()
                    .append(DIV(null, SPAN({ id: 'remainingTileCount' }, count),
                                " remaining tiles"));
            } else {
                $('#letterbagStatus')
                    .empty()
                    .append(DIV(null, "The letterbag is empty"));
            }
            if (count < 7) {
                $('#swapRack')
                    .empty();
            }
        }

        ui.drawBoard();
        ui.drawRack();
        ui.drawSwapRack();

        displayRemainingTileCount(gameData.remainingTileCount);

        function scrollLogToEnd(speed) {
            $('#log').animate({ scrollTop: $('#log').prop('scrollHeight') }, speed);
        }

        function appendTurnToLog(turn, suppressScroll) {
            player = ui.players[turn.player];
            var div = DIV({ 'class': 'moveScore' },
                          DIV({ 'class': 'score' },
                              SPAN({ 'class': 'playerName' }, player.name),
                              SPAN({ 'class': 'score' }, turn.score)));
            switch (turn.type) {
            case 'move':
                turn.move.words.forEach(function (word) {
                    $(div).append(DIV({ 'class': 'moveDetail' },
                                      SPAN({ 'class': 'word' }, word.word),
                                      SPAN({ 'class': 'score' }, word.score)));
                });
                break;
            case 'pass':
                $(div).append(DIV({ 'class': 'moveDetail' }, "Passed"));
                break;
            case 'swap':
                $(div).append(DIV({ 'class': 'moveDetail' }, "Swapped " + turn.count + " tile" + ((turn.count > 1) ? "s" : "")));
                break;
            default:
                $(div).append(DIV({ 'class': 'moveDetail' }, "unknown move type " + turn.type));
            }
            $('#log').append(div);
        }

        function processMoveScore(turn) {
            player = ui.players[turn.player];
            player.score += turn.score;
            $(player.scoreElement).text(player.score);
        }

        function displayNextGameMessage(nextGameKey) {
            if (nextGameKey) {
                $('#log')
                    .append(DIV({ 'class': 'nextGame' },
                                A({ href: '/game/' + nextGameKey + '/' + $.cookie(ui.gameKey)}, "next game")));
                $('#makeNextGame').remove();
            } else {
                var makeNextGameButton = BUTTON(null, "Make new game");
                $(makeNextGameButton)
                    .on('click', function() {
                        ui.sendMoveToServer('newGame', null);
                    });
                $('#log')
                    .append(DIV({ 'id': 'makeNextGame' },
                                makeNextGameButton));
            }
        }

        function displayEndMessage(endMessage) {
            var winners;
            for (var i in ui.players) {
                var player = ui.players[i];
                var endPlayer = endMessage.players[i];
                player.score = endPlayer.score;
                player.tallyScore = endPlayer.tallyScore;
                player.rack = endPlayer.rack;
                if (player.tallyScore > 0) {
                    $('#log').append(DIV({ 'class': 'gameEndScore' },
                                         player.name + ' gained ' + player.tallyScore + ' points from racks of the other players'));
                } else {
                    $('#log').append(DIV({ 'class': 'gameEndScore' },
                                         player.name + ' lost ' + -player.tallyScore + ' points for his rack containing the letters '
                                         + _.without(player.rack.squares.map(function (square) {
                                             if (square.tile) {
                                                 return square.tile.letter;
                                             }
                                         }), undefined)));
                }
                $(player.scoreElement).text(player.score);
                if (!winners || player.score > winners[0].score) {
                    winners = [ player ];
                } else if (player.score == winners[0].score) {
                    winners.push(player);
                }
            }
            var you = ui.players[ui.playerNumber];
            var youHaveWon = _.contains(winners, you);
            $('#whosturn').empty();
            $('#log')
                .append(DIV({ 'class': 'gameEnded' },
                            'Game has ended, '
                            + joinProse(winners.map(function (player) {
                                return (player == you) ? 'you' : player.name
                            }))
                            + (((winners.length == 1) && !youHaveWon) ? ' has ' : ' have ') + 'won'));
            displayNextGameMessage(endMessage.nextGameKey);
        }

        function placeTurnTiles(turn) {
            for (var i in turn.placements) {
                var placement = turn.placements[i];
                ui.board.squares[placement.x][placement.y].placeTile(new Tile(placement.letter, placement.score), true);
            }
        }

        function displayWhosTurn(playerNumber) {
            if (playerNumber == ui.playerNumber) {
                $('#whosturn').empty().text("Your turn");
                $('#turnControls').css('display', 'block');
            } else if (typeof playerNumber == 'number') {
                var name = ui.players[playerNumber].name;
                $('#whosturn').empty().text(name + "'" + ((name.charAt(name.length - 1) == 's') ? '' : 's') + " turn");
                $('#turnControls').css('display', 'none');
            } else {
                $('#whosturn').empty();
                $('#turnControls').css('display', 'none');
            }
        }

        gameData.turns.map(appendTurnToLog);

        if (gameData.endMessage) {
            displayEndMessage(gameData.endMessage);
        }

        scrollLogToEnd(0);

        displayWhosTurn(gameData.whosTurn);
        ui.boardLocked(ui.playerNumber != gameData.whosTurn);

        ui.socket = io.connect();
        ui.socket
            .on('connect', function(data) {
                console.log('socket connected');
                if (ui.wasConnected) {
                    ui.cancelNotification();
                    window.location = window.location;
                } else {
                    ui.wasConnected = true;
                    ui.socket.emit('join', { gameKey: ui.gameKey });
                }
            })
            .on('disconnect', function(data) {
                console.log('socket disconnect');
                $.blockUI({ message: '<h1>Server unavailable, please wait</h1>' });
            })
            .on('turn', function (turn) {
                console.log('turn', turn);
                appendTurnToLog(turn);
                scrollLogToEnd(300);
                processMoveScore(turn);
                // If this has been a move by another player, place tiles on board
                if (turn.type == 'move' && turn.player != ui.playerNumber) {
                    placeTurnTiles(turn);
                }
                displayRemainingTileCount(turn.remainingTileCount);
                if (turn.whosTurn == ui.playerNumber) {
                    ui.playAudio("yourturn");
                    ui.boardLocked(false);
                }
                if (typeof turn.whosTurn == 'number') {
                    displayWhosTurn(turn.whosTurn);
                    if (turn.whosTurn == ui.playerNumber) {
                        ui.notify('Your turn!', ui.players[turn.player].name + ' has made a move and now it is your turn.');
                    }
                }
                ui.updateGameStatus();
            })
            .on('gameEnded', function (endMessage) {
                endMessage = thaw(endMessage, PrototypeMap);
                displayEndMessage(endMessage);
                ui.notify('Game over!', 'Your game is over...');
            })
            .on('nextGame', function (nextGameKey) {
                displayNextGameMessage(nextGameKey);
            });
        $(document)
            .bind('SquareChanged', ui.eventCallback(ui.updateSquare))
            .bind('Refresh', ui.eventCallback(ui.refresh))
            .bind('RefreshRack', ui.eventCallback(ui.refreshRack))
            .bind('RefreshBoard', ui.eventCallback(ui.refreshBoard));

    });
    var button = BUTTON({ id: 'turnButton', action: 'pass' }, 'Pass')
    $(button).bind('click', ui.eventCallback(ui.makeMove));
    $('#turnButtons').append(button);
    $('#turnButtons').append(BUTTON({ id: 'dummyInput' }, ""));

    $('#dummyInput')
        .on('keypress', function(event) {
            var letter = String.fromCharCode(event.charCode).toUpperCase();
            console.log('dummy input key pressed:', letter);
            if (ui.cursor && ui.legalLetters.indexOf(letter) != -1) {
                var rackSquare = ui.rack.findLetterSquare(letter, true);
                if (rackSquare) {
                    if (rackSquare.tile.isBlank()) {
                        rackSquare.tile.letter = letter;
                    }
                    ui.moveTile(rackSquare, ui.cursor.square);
                    var newCursorSquare;
                    if (ui.cursor.direction == 'horizontal') {
                        for (var x = ui.cursor.square.x; x < 15; x++) {
                            var boardSquare = ui.board.squares[x][ui.cursor.square.y];
                            if (!boardSquare.tile) {
                                newCursorSquare = boardSquare;
                                break;
                            }
                        }
                    } else {
                        for (var y = ui.cursor.square.y; y < 15; y++) {
                            var boardSquare = ui.board.squares[ui.cursor.square.x][y];
                            if (!boardSquare.tile) {
                                newCursorSquare = boardSquare;
                                break;
                            }
                        }
                    }
                    if (newCursorSquare) {
                        ui.cursor.square = newCursorSquare;
                        ui.updateBoardSquare(newCursorSquare);
                    } else {
                        delete ui.cursor;
                    }
                }
            }
        })
        .on('keydown', function(event) {
            console.log('keydown', event);

            function handled() {
                event.stopPropagation();
                event.preventDefault();
            }

            function move(dx, dy) {
                var x = ui.cursor.square.x;
                var y = ui.cursor.square.y;
                console.log('move cursor, x', x, 'y', y, 'dx', dx, 'dy', dy);
                if (ui.cursor) {
                    if (dx > 0) {
                        for (x++; x < 15 && ui.board.squares[x][y].tile; x++);
                    }
                    if (dx < 0) {
                        for (x--; x >= 0 && ui.board.squares[x][y].tile; x--);
                    }
                    if (dy > 0) {
                        for (y++; y < 15 && ui.board.squares[x][y].tile; y++);
                    }
                    if (dy < 0) {
                        for (y--; y >= 0 && ui.board.squares[x][y].tile; y--);
                    }
                    console.log('new position, x', x, 'y', y, 'cursor.x', ui.cursor.square.x, 'cursor.y', ui.cursor.square.y);
                    if (x >= 0 && x < 15
                        && y >= 0 && y < 15
                        && (x != ui.cursor.square.x || y != ui.cursor.square.y)) {
                        console.log('moving cursor');
                        var oldCursorSquare = ui.cursor.square;
                        ui.cursor.square = ui.board.squares[x][y];
                        ui.updateBoardSquare(oldCursorSquare);
                        ui.updateBoardSquare(ui.cursor.square);
                    }
                }
                handled();
            }

            function turnCursor() {
                if (ui.cursor) {
                    ui.cursor.direction = (ui.cursor.direction == 'horizontal') ? 'vertical' : 'horizontal';
                    ui.updateBoardSquare(ui.cursor.square);
                }
                handled();
            }

            function deleteLast() {
                // Not yet implemented
                handled();
            }

            switch (event.keyCode) {
            case $.ui.keyCode.UP:
                move(0, -1);
                break;
            case $.ui.keyCode.DOWN:
                move(0, 1);
                break;
            case $.ui.keyCode.LEFT:
                move(-1, 0);
                break;
            case $.ui.keyCode.RIGHT:
                move(1, 0);
                break;
            case $.ui.keyCode.SPACE:
                turnCursor();
                break;
            case $.ui.keyCode.BACKSPACE:
            case $.ui.keyCode.DELETE:
                deleteLast();
                break;
            }
        });
}

UI.prototype.eventCallback = function(f) {
    var ui = this;
    return function() {
        var args = Array.prototype.slice.call(arguments);
        args.shift();                                   // remove event
        if (typeof f == 'string') {
            f = ui[f];
        }
        f.apply(ui, args);
    }
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

UI.prototype.updateSquare = function(square) {
    if (square.owner == this.rack
        || square.owner == this.swapRack) {
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
			    ui.selectSquare(null);
			    return;
			}
		    }
		    ui.selectSquare(square);
		}
	    );
	    
	    var doneOnce = false;
	    
	    $(div).draggable({
		revert: "invalid",
		opacity: 1,
		helper: "clone",
		start: function(event, jui) {
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
		}
	    });
	}

        $(div).append(A(null,
                        SPAN({ 'class': 'Letter' }, square.tile.letter ? square.tile.letter : ''),
                        SPAN({ 'class': 'Score' }, square.tile.score ? square.tile.score : '0')));
    } else {
        if (!ui.boardLocked()) {
	    $(div)
                .click(function () {
		    if (ui.currentlySelectedSquare) {
                        ui.moveTile(ui.currentlySelectedSquare, square);
		        ui.selectSquare(null);
		    } else {
                        function placeCursor() {
                            ui.cursor = { square: square,
                                          direction: 'horizontal' };
                        }
                        if (ui.cursor) {
                            if (ui.cursor.square == square) {
                                // clicked on cursor to change direction
                                if (ui.cursor.direction == 'horizontal') {
                                    ui.cursor.direction = 'vertical';
                                } else {
                                    delete ui.cursor;
                                }
                            } else {
                                // clicked on other square to move cursor
                                var oldCursor = ui.cursor;
                                delete ui.cursor;
                                ui.updateBoardSquare(oldCursor.square);
                                placeCursor();
                            }
                        } else {
                            placeCursor();
                        }
                        ui.updateSquare(square);
                    }
	        })
                .droppable({
	            hoverClass: "dropActive",
	            drop: function(event, jui) {
                        ui.deleteCursor();
                        ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	            }
	        });
        }

        var text = ' ';
        if (ui.cursor && ui.cursor.square == square) {
            text = (ui.cursor.direction == 'horizontal') ? '\u21d2' : '\u21d3';
            $(div).addClass('Cursor');
            $('#dummyInput').focus();
        } else {
	    switch (square.type) {
	    case 'DoubleWord':
	        if (square.x == 7 && square.y == 7) {
                    text = '\u2605';
	        } else {
                    text = "DOUBLE WORD SCORE";
	        }
	        break;
	    case 'TripleWord':
                text = "TRIPLE WORD SCORE";
	        break;
	    case 'DoubleLetter':
                text = "DOUBLE LETTER SCORE";
	        break;
	    case 'TripleLetter':
                text = "TRIPLE LETTER SCORE";
	    }
        }
        $(div)
            .addClass('Empty')
            .append(A(null, text));
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
                                               var tdClass = square.type;
                                               if (x == 7 && y == 7) {
                                                   tdClass += ' StartField';
                                               } else if (square.type != 'Normal') {
                                                   tdClass += ' SpecialField';
                                               }
                                               return TD({ 'class': tdClass },
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
			    ui.selectSquare(null);
			    return;
		        }
		    }
		    ui.selectSquare(square);
                }
	    );

	var doneOnce = false;
	
	$(div).draggable({
	    revert: "invalid",
	    opacity: 1,
	    helper: "clone",
	    start: function(event, jui) {
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
                ui.deleteCursor();
                ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
	    }
	});
    }
}

UI.prototype.drawRack = function() {
    var rack = this.rack;

    $('#rack')
        .append(DIV({ id: 'rackButtons' },
                    BUTTON({ id: 'Shuffle' }, "Shuffle"),
                    BR(),
                    BUTTON({ id: 'TakeBackTiles' }, "TakeBackTiles")),
                TABLE(null,
                      TR(null,
                         map(function (x) {
                             var id = 'Rack_' + x;
                             rack.squares[x].id = id;
                             return TD({ 'class': 'Normal' },
                                       DIV({ id: id }, A()));
                         }, range(8)))));
    var ui = this;
    ['Shuffle', 'TakeBackTiles'].forEach(function (action) {
        $('#' + action).bind('click', ui.eventCallback(action));
    });
    forEach(range(8), function (x) {
	ui.updateRackSquare(rack.squares[x]);
    });
}

UI.prototype.drawSwapRack = function() {
    var swapRack = this.swapRack;
    $('#swapRack')
        .append(TABLE(null,
                      TR(null,
                         map(function (x) {
                             var id = 'SwapRack_' + x;
                             swapRack.squares[x].id = id;
                             return TD({ 'class': 'Normal' },
                                       DIV({ id: id }, A()));
                         }, range(7)))));
    forEach(range(7), function (x) {
	ui.updateRackSquare(swapRack.squares[x]);
    });
}

UI.prototype.refreshRack = function() {
    var rack = this.rack;
    for (var x = 0; x < rack.squares.length; x++) {
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
    var ui = this;
    fromSquare.placeTile(null);
    fromSquare.owner.tileCount--;
    if (tile.isBlank() && !tile.letter || (tile.letter == ' ')) {
        if (fromSquare.owner != this.board && toSquare.owner == this.board) {
            $('#blankLetterRequester button')
                .on('keypress', function (event) {
                    var letter = String.fromCharCode(event.charCode);
                    if (letter != '') {
                        letter = letter.toUpperCase();
                        if (ui.legalLetters.indexOf(letter) != -1) {
                            $(this).off('keypress');
                            tile.letter = letter;
                            $.unblockUI();
                            ui.updateSquare(toSquare);
                            $('#dummyInput').focus();
                        }
                    }
                });
            $.blockUI({ message: $('#blankLetterRequester') });
        } else if (toSquare.owner == ui.rack || toSquare.owner == ui.swapRack) {
            tile.letter = ' ';
        }
    }
    toSquare.placeTile(tile);
    toSquare.owner.tileCount++;
    if (!this.boardLocked()) {
        setTimeout(function () { ui.updateGameStatus() }, 100);
    }
}

UI.prototype.updateGameStatus = function() {
    $('#move').empty();
    if (this.board.tileCount > 0) {
        this.setMoveAction('commitMove', 'Make move');
        var move = calculateMove(this.board.squares);
        if (move.error) {
            $('#move')
                .append(move.error);
            $('#turnButton').attr('disabled', 'disabled');
        } else {
            $('#move')
                .append(DIV(null, "score: " + move.score));
            move.words.forEach(function (word) {
                $('#move')
                    .append(DIV(null, word.word + " " + word.score));
            });
            $('#turnButton').removeAttr('disabled');
        }
        $('#swapRack').css('display', 'none');
        $('#TakeBackTiles').css('visibility', 'inherit');
    } else if (this.swapRack.tileCount > 0) {
        this.setMoveAction('swapTiles', 'Swap tiles');
        $('#board .ui-droppable').droppable('disable');
        $('#turnButton').removeAttr('disabled');
        $('#TakeBackTiles').css('visibility', 'inherit');
    } else {
        this.setMoveAction('pass', 'Pass');
        $('#board .ui-droppable').droppable('enable');
        $('#swapRack').css('display', 'block');
        $('#turnButton').removeAttr('disabled');
        $('#TakeBackTiles').css('visibility', 'hidden');
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

UI.prototype.sendMoveToServer = function(command, args, success) {
    this.cancelNotification();
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
        if (newVal) {
            $('#turnButton').attr('disabled', 'disabled');
        } else {
            $('#turnButton').removeAttr('disabled');
        }
        this.board.locked = newVal;
        this.refreshBoard();
    }
    return this.board.locked;
}

UI.prototype.endMove = function() {
    $('#move').empty();
    this.boardLocked(true);
}

UI.prototype.processMoveResponse = function(data) {
    console.log('move response:', data);
    var ui = this;
    data = thaw(data, PrototypeMap);
    if (!data.newTiles) {
        console.log('expected new tiles, got ' + data);
    }
    ui.rack.squares.forEach(function (square) {
        if (data.newTiles.length) {
            if (!square.tile) {
                square.placeTile(data.newTiles.pop());
                ui.rack.tileCount++;
                ui.updateRackSquare(square);
            }
        }
    });
}

UI.prototype.commitMove = function() {
    var ui = this;
    var move = calculateMove(this.board.squares);
    if (move.error) {
        alert(move.error);
        return;
    }
    this.endMove();
    for (var i = 0; i < move.tilesPlaced.length; i++) {
        var tilePlaced = move.tilesPlaced[i];
        var square = ui.board.squares[tilePlaced.x][tilePlaced.y];
        square.tileLocked = true;
        ui.updateBoardSquare(square);
    }
    ui.board.tileCount = 0;
    console.log(move.tilesPlaced);
    ui.sendMoveToServer('makeMove',
                        move.tilesPlaced,
                        bind(this.processMoveResponse, ui));

    ui.enableNotifications();
}

UI.prototype.pass = function() {
    var ui = this;
    ui.TakeBackTiles();
    ui.endMove();
    ui.sendMoveToServer('pass')
}

UI.prototype.swapTiles = function() {
    var ui = this;
    ui.endMove();
    var letters = ui.swapRack.letters();
    ui.swapRack.squares.forEach(function(square) {
        square.placeTile(null);
        ui.swapRack.tileCount--;
    });
    ui.sendMoveToServer('swap',
                        letters,
                        bind(this.processMoveResponse, ui));
}

UI.prototype.setMoveAction = function(action, title) {
    $('#turnButton')
        .attr('action', action)
        .empty()
        .append(title);
}

UI.prototype.makeMove = function() {
    var action = $('#turnButton').attr('action');
    console.log('makeMove =>', action);
    this.deleteCursor();
    this[action]();
}

UI.prototype.deleteCursor = function() {
    if (ui.cursor) {
        var cursorSquare = ui.cursor.square;
        delete ui.cursor;
        ui.updateBoardSquare(cursorSquare);
    }
}

UI.prototype.TakeBackTiles = function() {
    var ui = this;
    var freeRackSquares = filter(function (square) { return !square.tile }, ui.rack.squares);
    function putBackToRack(tile) {
        if (tile.isBlank()) {
            tile.letter = ' ';
        }
        var square = freeRackSquares.pop();
        square.tile = tile;
        ui.rack.tileCount++;
        ui.updateRackSquare(square);
    }
        
    ui.board.forAllSquares(function(boardSquare) {
        if (boardSquare.tile && !boardSquare.tileLocked) {
            putBackToRack(boardSquare.tile);
            boardSquare.tile = null;
            ui.board.tileCount--;
            ui.updateBoardSquare(boardSquare);
        }
    });
    ui.swapRack.squares.forEach(function(swapRackSquare) {
        if (swapRackSquare.tile) {
            putBackToRack(swapRackSquare.tile);
            swapRackSquare.tile = null;
            ui.swapRack.tileCount--;
            ui.updateRackSquare(swapRackSquare);
        }
    });
    this.deleteCursor();
    ui.updateGameStatus();
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

UI.prototype.enableNotifications = function() {
    // must be called in response to user action
    if (window.webkitNotifications) {
        console.log('notification permission:', window.webkitNotifications.checkPermission());
        if (window.webkitNotifications.checkPermission() != 0) {
            console.log('requesting notification permission');
            window.webkitNotifications.requestPermission();
        }
    }
}

UI.prototype.notify = function(title, text) {
    var ui = this;
    if (window.webkitNotifications) {
        this.cancelNotification();
        var notification = window.webkitNotifications.createNotification('favicon.ico', title, text);
        ui.notification = notification;
        $(notification)
            .on('click', function () {
                this.cancel();
            })
            .on('close', function () {
                delete ui.notification;
            });
        notification.show();
    }
}

UI.prototype.cancelNotification = function() {
    if (this.notification) {
        this.notification.cancel();
        delete this.notification;
    }
}