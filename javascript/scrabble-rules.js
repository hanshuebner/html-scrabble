function MakeBoardArray()
{
    var retval = new Array(15);
    for (var x = 0; x < 15; x++) {
        retval[x] = new Array(15);
    }
    return retval;
}

function calculateMove(squares)
{
    // Check that the start field is occupied
    if (!squares[7][7].Tile) {
        return { error: "start field must be used" };
    }
    
    // Determine that the placement of the Tile(s) is legal
    
    // Find top-leftmost placed tile
    var x;
    var y;
    var topLeftX;
    var topLeftY;
    var tile;
    for (y = 0; !tile && y < 15; y++) {
        for (x = 0; !tile && x < 15; x++) {
            if (squares[x][y].Tile && !squares[x][y].TileLocked) {
                tile = squares[x][y].Tile;
                topLeftX = x;
                topLeftY = y;
            }
        }
    }
    if (!tile) {
        return { error: "no new tile found" };
    }
    
    // Remember which newly placed tile positions are legal
    var legalPlacements = MakeBoardArray();
    legalPlacements[topLeftX][topLeftY] = true;

    function touchingOld(x, y) {
        var retval = 
        (x > 0 && squares[x - 1][y].Tile && squares[x - 1][y].TileLocked)
            || (x < 14 && squares[x + 1][y].Tile && squares[x + 1][y].TileLocked)
            || (y > 0 && squares[x][y - 1].Tile && squares[x][y - 1].TileLocked)
            || (y < 14 && squares[x][y + 1].Tile && squares[x][y + 1].TileLocked);
        return retval;
    }

    var isTouchingOld = touchingOld(topLeftX, topLeftY);
    var horizontal = false;
    for (var x = topLeftX + 1; x < 15; x++) {
        if (!squares[x][topLeftY].Tile) {
            break;
        } else if (!squares[x][topLeftY].TileLocked) {
            legalPlacements[x][topLeftY] = true;
            horizontal = true;
            isTouchingOld = isTouchingOld || touchingOld(x, topLeftY);
        }
    }

    if (!horizontal) {
        for (var y = topLeftY + 1; y < 15; y++) {
            if (!squares[topLeftX][y].Tile) {
                break;
            } else if (!squares[topLeftX][y].TileLocked) {
                legalPlacements[topLeftX][y] = true;
                isTouchingOld = isTouchingOld || touchingOld(topLeftX, y);
            }
        }
    }

    if (!isTouchingOld && !legalPlacements[7][7]) {
        return { error: 'not touching old tile ' + topLeftX + '/' + topLeftY };
    }

    // Check whether there are any unconnected other placements 
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            var square = squares[x][y];
            if (square.Tile && !square.TileLocked && !legalPlacements[x][y]) {
                return { error: 'unconnected placement' };
            }
        }
    }

    var move = { words: [] };

    // The move was legal, calculate scores
    function horizontalWordScores(squares) {
        var score = 0;
        for (var y = 0; y < 15; y++) {
            for (var x = 0; x < 14; x++) {
                if (squares[x][y].Tile && squares[x + 1][y].Tile) {
                    var wordScore = 0;
                    var letters = '';
                    var wordMultiplier = 1;
                    var isNewWord = false;
                    for (; x < 15 && squares[x][y].Tile; x++) {
                        var square = squares[x][y];
                        var letterScore = square.Tile.Score;
                        isNewWord = isNewWord || !square.TileLocked;
                        if (!square.TileLocked) {
                            switch (square.Type) {
                            case SquareType.DoubleLetter:
                                letterScore *= 2;
                                break;
                            case SquareType.TripleLetter:
                                letterScore *= 3;
                                break;
                            case SquareType.DoubleWord:
                                wordMultiplier *= 2;
                                break;
                            case SquareType.TripleWord:
                                wordMultiplier *= 3;
                                break;
                            }
                        }
                        wordScore += letterScore;
                        letters += square.Tile.Letter;
                    }
                    wordScore *= wordMultiplier;
                    if (isNewWord) {
                        console.log("word: [" + letters + "] score " + wordScore);
                        move.words.push({ word: letters, score: wordScore });
                        score += wordScore;
                    }
                }
            }
        }
        return score;
    }

    move.score = horizontalWordScores(squares);
    // Create rotated version of the board to calculate vertical word scores.
    var rotatedSquares = MakeBoardArray();
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            rotatedSquares[x][y] = squares[y][x];
        }
    }
    move.score += horizontalWordScores(rotatedSquares);

    // Collect and count tiles placed.
    var tilesPlaced = [];
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            var square = squares[x][y];
            if (square.Tile && !square.TileLocked) {
                tilesPlaced.push({ Letter: square.Tile.Letter,
                                   X: x,
                                   Y: y });
            }
        }
    }
    if (tilesPlaced.length == 7) {
        move.score += 50;
        console.log('all letters placed, 50 points bonus');
    }
    move.tilesPlaced = tilesPlaced;

    console.log('move score: ' + move.score);

    return move;
}

