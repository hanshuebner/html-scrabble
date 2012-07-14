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
        return _.reduce(array.slice(1, length - 1), function (word, accu) { return word + ", " + accu }, array[0]) + " and " + array[length - 1];
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
        ui.board = gameData.board;
        ui.players = gameData.players;
        var playerNumber = 0;
        $('#scoreboard')
            .append(TABLE(null,
                          gameData.players.map(function(player) {
                              if (player.rack) {
                                  ui.rack = player.rack;
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
            $('#log').append(DIV({ 'class': 'gameEnded' },
                                 'Game has ended, '
                                 + joinProse(winners.map(function (player) {
                                     return (player == you) ? 'you' : player.name
                                 }))
                                 + (((winners.length == 1) && !youHaveWon) ? ' has ' : ' have ') + 'won'))
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
            } else if (typeof playerNumber == 'number') {
                var name = ui.players[playerNumber].name;
                $('#whosturn').empty().text(name + "'" + ((name.charAt(name.length - 1) == 's') ? '' : 's') + " turn");
            } else {
                $('#whosturn').empty();
            }
        }

        gameData.turns.map(appendTurnToLog);
        scrollLogToEnd(0);

        if (gameData.endMessage) {
            displayEndMessage(gameData.endMessage);
        }

        displayWhosTurn(gameData.whosTurn);
        ui.boardLocked(ui.playerNumber != gameData.whosTurn);

        ui.socket = io.connect();
        ui.socket
            .on('connect', function(data) {
                console.log('socket connected');
                if (ui.wasConnected) {
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
            })
            .on('gameEnded', function (endMessage) {
                endMessage = thaw(endMessage, PrototypeMap);
                displayEndMessage(endMessage);
                ui.notify('Game over!', 'Your game is over...');
            });
        $(document)
            .bind('SquareChanged', ui.eventCallback(ui.updateSquare))
            .bind('Refresh', ui.eventCallback(ui.refresh))
            .bind('RefreshRack', ui.eventCallback(ui.refreshRack))
            .bind('RefreshBoard', ui.eventCallback(ui.refreshBoard));

    });
    ['CommitMove', 'Pass', 'SwapTiles'].forEach(function (action) {
        var button = BUTTON({ id: action, disabled: 'disabled' }, action)
        $(button).bind('click', ui.eventCallback(ui[action]));
        $('#turnButtons').append(button);
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
                         BUTTON({ id: 'Shuffle' }, "Shuffle"),
                         BR(),
                         BUTTON({ id: 'TakeBackTiles' }, "TakeBackTiles"),
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
            $('#turnButtons button').attr('disabled', 'disabled');
        } else {
            $('#turnButtons button').removeAttr('disabled');
            $('#CommitMove').attr('disabled', 'disabled');
        }
        this.board.locked = newVal;
        this.refreshBoard();
    }
    return this.board.locked;
}

UI.prototype.endMove = function() {
    $('#move').empty();
    $('#turnButtons button').attr('disabled', 'disabled');
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
                ui.updateRackSquare(square);
            }
        }
    });
}

UI.prototype.CommitMove = function() {
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
    console.log(move.tilesPlaced);
    ui.sendMoveToServer('makeMove',
                        move.tilesPlaced,
                        bind(this.processMoveResponse, ui));

    ui.enableNotifications();
}

UI.prototype.Pass = function() {
    var ui = this;
    ui.TakeBackTiles();
    ui.endMove();
    ui.sendMoveToServer('pass')
}

UI.prototype.SwapTiles = function() {
    var ui = this;
    ui.endMove();
    var letters = ui.swapRack.letters();
    ui.swapRack.squares.forEach(function(square) {
        square.placeTile(null);
    });
    ui.sendMoveToServer('swap',
                        letters,
                        bind(this.processMoveResponse, ui));
}

UI.prototype.TakeBackTiles = function() {
    var ui = this;
    var freeRackSquares = filter(function (square) { return !square.tile }, ui.rack.squares);
    function putBackToRack(tile) {
        var square = freeRackSquares.pop();
        square.tile = tile;
        ui.updateRackSquare(square);
    }
        
    ui.board.forAllSquares(function(boardSquare) {
        if (boardSquare.tile && !boardSquare.tileLocked) {
            putBackToRack(boardSquare.tile);
            boardSquare.tile = null;
            ui.updateBoardSquare(boardSquare);
        }
    });
    ui.swapRack.squares.forEach(function(swapRackSquare) {
        if (swapRackSquare.tile) {
            putBackToRack(swapRackSquare.tile);
            swapRackSquare.tile = null;
            ui.updateRackSquare(swapRackSquare);
        }
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