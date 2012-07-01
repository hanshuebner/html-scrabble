function MakeBoardArray()
{
    var retval = new Array(15);
    for (var x = 0; x < 15; x++) {
        retval[x] = new Array(15);
    }
    return retval;
}

function calculateBoard(squares)
{
    // Check that the start field is occupied
    if (!squares[7][7].Tile) {
        console.log("start field must be used");
        return null;
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
            if (squares[x][y].Tile && !squares[x][y].Tile.TileLocked) {
                tile = squares[x][y].Tile;
                topLeftX = x;
                topLeftY = y;
            }
        }
    }
    if (!tile) {
        console.log("no new tile found");
        return null;
    }
    
    // Remember which newly placed tile positions are legal
    var legalPlacements = MakeBoardArray();
    legalPlacements[topLeftX][topLeftY] = true;

    function touchingOld(x, y) {
        var retval = 
        (x > 0 && squares[x - 1][y].Tile && squares[x - 1][y].Tile.TileLocked)
            || (x < 14 && squares[x + 1][y].Tile && squares[x + 1][y].Tile.TileLocked)
            || (y > 0 && squares[x][y - 1].Tile && squares[x][y - 1].Tile.TileLocked)
            || (y < 14 && squares[x][y + 1].Tile && squares[x][y + 1].Tile.TileLocked);
        return retval;
    }

    var isTouchingOld = touchingOld(topLeftX, topLeftY);
    var horizontal = false;
    for (var x = topLeftX + 1; x < 15; x++) {
        if (!squares[x][topLeftY].Tile) {
            break;
        } else if (!squares[x][topLeftY].Tile.TileLocked) {
            legalPlacements[x][topLeftY] = true;
            horizontal = true;
            isTouchingOld |= touchingOld(x, topLeftY);
        }
    }

    if (!horizontal) {
        for (var y = topLeftY + 1; y < 15; y++) {
            if (!squares[topLeftX][y].Tile) {
                break;
            } else if (!squares[topLeftX][y].Tile.TileLocked) {
                legalPlacements[topLeftX][y] = true;
                isTouchingOld |= touchingOld(topLeftX, y);
            }
        }
    }

    if (!isTouchingOld && !legalPlacements[7][7]) {
        console.log('not touching old tile ' + topLeftX + '/' + topLeftY);
        return null;
    }

    // Check whether there are any unconnected other placements 
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            var square = squares[x][y];
            if (square.Tile && !square.Tile.TileLocked && !legalPlacements[x][y]) {
                console.log('unconnected placement');
                return false;
            }
        }
    }

    // The move was legal, calculate values
    function horizontalWordValues(squares) {
        var value = 0;
        for (var y = 0; y < 15; y++) {
            for (var x = 0; x < 14; x++) {
                if (squares[x][y].Tile && squares[x + 1][y].Tile) {
                    var wordValue = 0;
                    var letters = '';
                    var wordMultiplier = 1;
                    var isNewWord = false;
                    for (; x < 15 && squares[x][y].Tile; x++) {
                        var square = squares[x][y];
                        var letterScore = square.Tile.Score;
                        isNewWord = isNewWord || !square.Tile.TileLocked;
                        if (!square.Tile.TileLocked) {
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
                        wordValue += letterScore;
                        letters += square.Tile.Letter;
                    }
                    wordValue *= wordMultiplier;
                    if (isNewWord) {
                        console.log("word: [" + letters + "] value " + wordValue);
                        value += wordValue;
                    }
                }
            }
        }
        return value;
    }

    var moveValue = horizontalWordValues(squares);
    // Create rotated version of the board to calculate vertical word values.
    var rotatedSquares = MakeBoardArray();
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            rotatedSquares[x][y] = squares[y][x];
        }
    }
    moveValue += horizontalWordValues(rotatedSquares);

    // Count the number of letters placed.
    var lettersPlaced = 0;
    for (var x = 0; x < 15; x++) {
        for (var y = 0; y < 15; y++) {
            var square = squares[x][y];
            if (square.Tile && !square.Tile.TileLocked) {
                lettersPlaced++;
            }
        }
    }
    if (lettersPlaced == 7) {
        moveValue += 50;
        console.log('all letters placed, 50 points bonus');
    }

    console.log('move value: ' + moveValue);

    return moveValue;
}

