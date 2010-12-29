/*
Coding Exercise: multiplayer online Scrabble(tm) clone written in modern HTML, CSS, and JavaScript

IMPORTANT COPYRIGHT NOTICE:

SCRABBLE® is a registered trademark. All intellectual property rights in and to the game are owned in the U.S.A and Canada by Hasbro Inc., and throughout the rest of the world by J.W. Spear & Sons Limited of Maidenhead, Berkshire, England, a subsidiary of Mattel Inc.

This experimental project is not associated with any of the owners of the Scrabble brand.
*/

/*
Useful references:

http://en.wikipedia.org/wiki/Scrabble_letter_distributions

http://en.wikipedia.org/wiki/Scrabble
http://fr.wikipedia.org/wiki/Scrabble

http://ngrams.googlelabs.com/datasets
*/

/*
Similar HTML/Javascript projects:

http://www.themaninblue.com/writing/perspective/2004/01/27/

http://code.google.com/p/scrabbly/source/browse/trunk/scrabble.js
*/

// BEGIN script-scope ------------------
(function(){

var _OBJECT_ROOT_ = window;

if (typeof _OBJECT_ROOT_.console == "undefined" || !_OBJECT_ROOT_.console)
{
	// !console.firebug
    
	//_OBJECT_ROOT_.console = {log: function() {}};
	
	var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];

	_OBJECT_ROOT_.console = {};

	for (var i = 0; i < names.length; ++i)
	{
		_OBJECT_ROOT_.console[names[i]] = function(){};
	}
}

function type_of(obj)
{
	if (typeof(obj) == 'object')
		if (typeof obj.length == "undefined" || !obj.length)
			return 'object';
		else
			return 'array';
	else
		return typeof(obj);
}

//=================================================
// BEGIN Namespace util ------------------
//var HTMLScrabble = (typeof HTMLScrabble == "undefined" || !HTMLScrabble ) ? {} : HTMLScrabble;
//var HTMLScrabble.UI = (typeof HTMLScrabble.UI == "undefined" || !(HTMLScrabble.UI) ) ? {} : HTMLScrabble.UI;
/*
console.log("Checking namespace: " + "HTMLScrabble.UI");
EnsureNamespace("HTMLScrabble.UI");

console.log("Checking namespace: " + "HTMLScrabble.Core");
EnsureNamespace("HTMLScrabble.Core");
*/
function EnsureNamespace(nsString)
//_OBJECT_ROOT_.EnsureNamespace = function(nsString)
{
	console.log("Ensuring namespace: " + nsString);
	
	var nsStrings = nsString.split(".");
	var root = _OBJECT_ROOT_;
	for (var i = 0; i < nsStrings.length; i++)
	{
		var nsName = nsStrings[i];
		var val = root[nsName];
		if (typeof val == "undefined" || !val)
		{
			console.log("Creating namespace object: " + nsName);
			root[nsName] = new Object(); // {} ?
		}
		else
		{
			console.log("Namespace object already exists: " + nsName);
		}
		root = root[nsName];
	}
}
// END Namespace util ------------------
//=================================================

//=================================================
// BEGIN EventsManager ------------------
//Events.AddEventListener('provide', function() {});
//Events.Dispatch('provide', { 'identifier': identifier });
if (typeof _OBJECT_ROOT_.EventsManager == "undefined" || !_OBJECT_ROOT_["EventsManager"])
_OBJECT_ROOT_.EventsManager = (function(){
var _EventsManager = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated "EventsManager" function)

var _EventListeners = {}; // private associative array (event name -> array of callback functions)

// eventName ==> string
// eventPayload ==> can be anything, but usually a simple associative array such as:
// { 'key1': "value1", 'key2': "value2" }
_EventsManager.DispatchEvent = function(eventName, eventPayload)
{
	var callbacks = _EventListeners[eventName]; // simple indexed array of callback functions
	if (typeof callbacks == "undefined" || !callbacks)
	{
		console.log("Event.Dispatch - no registered listeners for eventName: " + eventName);
		return;
	}
	
	if (callbacks.length == 0) // early check (fail-fast)
	{
		console.log("Event.Dispatch - empty registered listeners for eventName: " + eventName);
		return;
	}
	
	eventPayload.EventName = eventName; // append extra information for the listener to consume (passed via the callback function parameter)
	
	var propsString = "[";
	//for (var i = 0; i < properties.length; i++)
	for (var key in eventPayload)
	{
		propsString += "{" + key + ":" + eventPayload[key] + "}, ";
	}
	propsString += "]";

	for (var i = 0; i < callbacks.length; i++)
	{
		//console.log("Event.Dispatch - notifying: " + eventName + ", " + propsString);
		callbacks[i](eventPayload);
	}
};

_EventsManager.AddEventListener = function(eventName, callback)
{
	var callbacks = _EventListeners[eventName]; // simple indexed array of callback functions
	if (typeof callbacks == "undefined" || !callbacks)
	{
		console.log("Event.AddEventListener - init empty callbacks for eventName: " + eventName);
		_EventListeners[eventName] = [];
		callbacks = _EventListeners[eventName];
	}
	
	for (var i = 0; i < callbacks.length; i++)
	{
		if (callbacks[i] == callback)
		{
			console.log("Event.AddEventListener - callback already registered (duplicate ignored): " + eventName + ", " + callback);
			return;
		}
	}
	
	console.log("Event.AddEventListener - registered: " + eventName + ", " + callback);
	callbacks.push(callback);
};

_EventsManager.RemoveEventListener = function(eventName, callback)
{
	var callbacks = _EventListeners[eventName]; // simple indexed array of callback functions
	if (typeof callbacks == "undefined" || !callbacks)
	{
		console.log("Event.RemoveEventListener - no registered listeners for eventName: " + eventName);
		return;
	}
	
	if (callbacks.length == 0) // early check (fail-fast)
	{
		console.log("Event.RemoveEventListener - empty registered listeners for eventName: " + eventName);
		return;
	}
	
	var atLeastOneRemoved = false;
	for (var i = 0; i < callbacks.length; i++)
	{
		if (callbacks[i] == callback)
		{
			atLeastOneRemoved = true;
			console.log("Event.RemoveEventListener - unregistered: " + eventName + ", " + callback);
			//delete callbacks[i];
			callbacks.splice(i--, 1);
		}
	}
	
	if (callbacks.length == 0)
	{
		console.log("Event.RemoveEventListener - empty callback list, removing eventName entirely: " + eventName);
		delete _EventListeners[eventName];
	}

	if (!atLeastOneRemoved)
		console.log("Event.RemoveEventListener - callback for eventName not found: " + eventName + ", " + callback);
};

return _EventsManager;
})();
// END EventsManager ------------------
//=================================================

EnsureNamespace("Scrabble.Core");
EnsureNamespace("Scrabble.UI");

var IDPrefix_SquareOrTile = "squareOrTile_";


//=================================================
// BEGIN Scrabble.Core.Tile ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Tile == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Tile"])
_OBJECT_ROOT_.Scrabble.Core.Tile = (function(){

console.log("inside Scrabble.Core.Tile code scope");

with (Scrabble.Core)
{

//function _Tile()
var _Tile = function()
{
	this.Letter = arguments[0];
	this.Score = arguments[1];
}

_Tile.prototype.Letter = '';
_Tile.prototype.Score = 0;

_Tile.prototype.toString = function()
{
	return "Scrabble.Core.Tile toString(): [" + this.Letter + "] --> " + this.Score;
}

} // END - with (Scrabble.Core)

return _Tile;
})();
// END Scrabble.Core.Tile ------------------
//=================================================

//=================================================
// BEGIN Scrabble.Core.SquareType ------------------
Scrabble.Core.SquareType =
{
	Normal:0,
	DoubleLetter:1,
	DoubleWord:2,
	TripleLetter:3,
	TripleWord:4
};
// END Scrabble.Core.SquareType ------------------
//=================================================

//=================================================
// BEGIN Scrabble.Core.Square ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Square == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Square"])
_OBJECT_ROOT_.Scrabble.Core.Square = (function(){

console.log("inside Scrabble.Core.Square code scope");

with (Scrabble.Core)
{

//function _Board()
var _Square = function()
{
	switch (arguments[0])
	{
		case 0:
			//console.log("Scrabble.Core.Square constructor: SquareType.Normal");
			this.Type = SquareType.Normal;
			break;
		case 1:
			//console.log("Scrabble.Core.Square constructor: SquareType.DoubleLetter");
			this.Type = SquareType.DoubleLetter;
			break;
		case 2:
			//console.log("Scrabble.Core.Square constructor: SquareType.DoubleWord");
			this.Type = SquareType.DoubleWord;
			break;
		case 3:
			//console.log("Scrabble.Core.Square constructor: SquareType.TripleLetter");
			this.Type = SquareType.TripleLetter;
			break;
		case 4:
			//console.log("Scrabble.Core.Square constructor: SquareType.TripleWord");
			this.Type = SquareType.TripleWord;
			break;
		default:
			throw new Error("Illegal argument, first parameter of Scrabble.Core.Square constructor should be one of { SquareType.Normal, SquareType.DoubleLetter, SquareType.DoubleWord, SquareType.TripleLetter, SquareType.TripleWord }");
			break;
	}
}

_Square.prototype.X = 0;
_Square.prototype.Y = 0;

_Square.prototype.Tile = 0;

_Square.prototype.PlaceTile = function(tile)
{
	this.Tile = tile;
}

_Square.prototype.toString = function()
{
	return "Scrabble.Core.Square toString(): " + this.Type;
}

} // END - with (Scrabble.Core)

return _Square;
})();
// END Scrabble.Core.Square ------------------
//=================================================

//=================================================
// BEGIN Scrabble.Core.Board ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Board == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Board"])
_OBJECT_ROOT_.Scrabble.Core.Board = (function(){
//var _Board = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

console.log("inside Scrabble.Core.Board code scope");

with (Scrabble.Core)
{

//function _Board()
var _Board = function()
{
	function CreateGrid()
	{
		for (var y = 0; y < this.Dimension; y++)
		{
			for (var x = 0; x < this.Dimension; x++)
			{
				var centerStart = false;

				//SquareType.Normal, SquareType.DoubleLetter, SquareType.DoubleWord, SquareType.TripleLetter, SquareType.TripleWord
				var square = new Square(SquareType.Normal);
				
				var middle = Math.floor(this.Dimension / 2);
				var halfMiddle = Math.ceil(middle / 2);
				
				if (
					(
					x == 0 ||
					x == this.Dimension - 1 ||
					x == middle
					)
					&&
					(
					y == 0 ||
					y == this.Dimension - 1 ||
					y == middle && x != middle
					)
					)
				{
					square = new Square(SquareType.TripleWord);
				}
				else if (
					x == middle
					&&
					y == middle
					||
					x > 0 && x < middle - 2 && (y == x || y == this.Dimension - x - 1)
					||
					x > middle + 2 && x < this.Dimension - 1 && (x == y || x == this.Dimension - y - 1)
					)
				{
					square = new Square(SquareType.DoubleWord);
					if (x == middle && y == middle)
					{
						centerStart = true;
					}
				}
				else if (
					(x == middle - 1 || x == middle + 1)
					&&
					(y == middle - 1 || y == middle + 1)
					||
					(x == 0 || x == this.Dimension - 1 || x == middle) && (y == middle + halfMiddle || y == middle - halfMiddle)
					||
					(y == 0 || y == this.Dimension - 1 || y == middle) && (x == middle + halfMiddle || x == middle - halfMiddle)
					||
					(y == middle + 1 || y == middle - 1) && (x == middle + halfMiddle + 1 || x == middle - halfMiddle - 1)
					||
					(x == middle + 1 || x == middle - 1) && (y == middle + halfMiddle + 1 || y == middle - halfMiddle - 1)
					)
				{
					square = new Square(SquareType.DoubleLetter);
				}
				else if (
					(x == middle - 2 || x == middle + 2)
					&&
					(y == middle - 2 || y == middle + 2)
					||
					(y == middle + 2 || y == middle - 2) && (x == middle + halfMiddle + 2 || x == middle - halfMiddle - 2)
					||
					(x == middle + 2 || x == middle - 2) && (y == middle + halfMiddle + 2 || y == middle - halfMiddle - 2)
					)
				{
					square = new Square(SquareType.TripleLetter);
				}
				
				square.X = x;
				square.Y = y;
				this.SquaresList.push(square);
			}
		}
		
		EventsManager.DispatchEvent(this.Event_ScrabbleBoardReady, { 'Board': this });
	}

	function SetDimension()
	{
		var val = arguments[0];
		
		if (typeof val != 'number')
			throw new Error("Illegal argument Scrabble.Core.Board.SetDimension(), not a number: " + typeof val);
		
		if (val < 15)
			throw new Error("Illegal argument Scrabble.Core.Board.SetDimension(), number smaller than 15: " + val);
		
		this.Dimension = val;
	}

	//_Board.prototype.SetDimensions = function()
	function SetDimensions()
	{
		if (this instanceof _Board)
		{
			if (arguments.length > 0)
			{
				console.log("typeof ARGS: " + typeof arguments[0]);
				console.log("typeof ARGS: " + type_of(arguments[0]));
			
				switch (type_of(arguments[0]))
				{
					case 'number':
						SetDimension.apply(this, [arguments[0]]);
						console.log("Scrabble.Core.Board 'number' constructor: " + this.toString());
						return;
					case 'object':
						SetDimension.apply(this, [arguments[0]['Dimension']]);
						console.log("Scrabble.Core.Board 'object' constructor: " + this.toString());
						return;
					case 'array':
					default:
						var argumentsString = "";
						for (var i = 0; i < arguments.length; i++)
						{
							argumentsString += arguments[0] + ", ";
						}
						throw new Error("Illegal arguments Scrabble.Core.Board.SetDimensions(): " + argumentsString);
						break;
				}
			}
			else
			{
				this.Dimension = 15;
				console.log("Scrabble.Core.Board constructor with empty parameters (default "+this.Dimension+"x"+this.Dimension+")");
			}
		}
		else
		{
			throw new Error('Illegal method call Scrabble.Core.Board.SetDimensions() on :' + typeof this);
		}
	}
	
	console.log("Scrabble.Core.Board constructor before applying parameters");
	SetDimensions.apply(this, arguments);
	//SetDimensions(arguments);
	
	CreateGrid.apply(this);
	this.GenerateRandomTiles();
}

_Board.prototype.Event_ScrabbleBoardReady = "ScrabbleBoardReady";
_Board.prototype.Event_ScrabbleSquareTileChanged = "ScrabbleSquareTileChanged";

_Board.prototype.Dimension = NaN;

_Board.prototype.SquaresList = [];

_Board.prototype.MoveTile = function(tileXY, squareXY)
{
	var square1 = this.SquaresList[tileXY.x + this.Dimension * tileXY.y];
	var square2 = this.SquaresList[squareXY.x + this.Dimension * squareXY.y];

	var tile = square1.Tile;
	square1.PlaceTile(0);
	square2.PlaceTile(tile);

	var audio = document.getElementById(square2.Type == SquareType.Normal ? 'audio2' : 'audio3');
	audio.pause();
	audio.play();
	
	EventsManager.DispatchEvent(this.Event_ScrabbleSquareTileChanged, { 'Board': this, 'Square': square1 });
	EventsManager.DispatchEvent(this.Event_ScrabbleSquareTileChanged, { 'Board': this, 'Square': square2 });
}

_Board.prototype.GenerateRandomTiles = function()
{
	var audio = document.getElementById('audio1');
	audio.pause();
	audio.play();
	
	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var centerStart = false;
		
			var square = this.SquaresList[x + this.Dimension * y];
		
			var middle = Math.floor(this.Dimension / 2);
			var halfMiddle = Math.ceil(middle / 2);
		
			var makeTile = Math.floor(Math.random()*2);
			if (makeTile && y <= middle)
			{
				var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				var letter_index = Math.floor(Math.random() * letters.length);
				var letter = letters.substring(letter_index, letter_index+1);
			
				var score = Math.floor(Math.random()*10) + 1;
			
				var tile = new Tile(letter, score);
				square.PlaceTile(tile);
			
				EventsManager.DispatchEvent(this.Event_ScrabbleSquareTileChanged,
											{ 'Board': this, 'Square': square });
			}
			else if (square.Tile != 0)
			{
				square.PlaceTile(0);
				
				EventsManager.DispatchEvent(this.Event_ScrabbleSquareTileChanged,
											{ 'Board': this, 'Square': square });
			}
		}
	}
}


_Board.prototype.toString = function()
{
	return "Scrabble.Core.Board toString(): " + this.Dimension + " x " + this.Dimension;
}

} // END - with (Scrabble.Core)

return _Board;
})();
// END Scrabble.Core.Board ------------------
//=================================================

//Tile
//LetterDistribution

//=================================================
// BEGIN Scrabble.UI.Html ------------------
if (typeof _OBJECT_ROOT_.Scrabble.UI.Html == "undefined" || !_OBJECT_ROOT_.Scrabble.UI["Html"])
_OBJECT_ROOT_.Scrabble.UI.Html = (function(){
//var _Html = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

console.log("inside Scrabble.UI.Html code scope");

with (Scrabble.Core)
{
var _Html = function()
{
	function UpdateHtmlTableCell(board, square)
	{
		var id = IDPrefix_SquareOrTile + square.X + "x" + square.Y;
		var td = document.getElementById(id).parentNode;
		if (td.hasChildNodes())
		{
			while (td.childNodes.length >= 1)
			{
				td.removeChild(td.firstChild);
		    }
		}
		
		var a = document.createElement('a');
		td.appendChild(a);
		a.setAttribute('id', id);
		
		if (square.Tile != 0)
		{
			//td.setAttribute('class', td.getAttribute('class') + ' Tile');
			a.setAttribute('class', 'Tile');
			
			$(a).draggable({ //"#board .Tile"
				revert: "invalid",
				cursor: "move",
				opacity: 1,
				helper: "clone",
				//snap: ".Empty",
				start: function(event, ui)
				{
					$(this).css({ opacity: 0.5 });
					
					$(ui.helper).animate({'font-size' : '0.7em'}, 300); //height : '+=10px', width : '+=10px', 
					var shadow = "4px 4px 5px #333333";
					$(ui.helper).css({"-webkit-box-shadow": shadow});
					$(ui.helper).css({"-moz-box-shadow": shadow});
					$(ui.helper).css({"box-shadow": shadow});
					
					
					$(ui.helper).css({ "z-index": 1000 });
				},
				drag: function() {},
				stop: function()
				{
					$(this).css({ opacity: 1 });
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
		}
		else
		{
			a.setAttribute('class', 'Empty');
			
			$(a).droppable({ //"#board .Empty"
				//accept: ".Tile",
				//activeClass: "dropActive",
				hoverClass: "dropActive",
				drop: function( event, ui )
				{
					//$( this ).addClass( "dropActive" );
				
					var id1 = $(ui.draggable).attr("id");
					var id2 = $(this).attr("id");
				
					//alert(id1 + "-->" + id2);
				
					var underscore1 = id1.indexOf("_");
					var cross1 = id1.indexOf("x");
					var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
					var y1 = parseInt(id1.substring(cross1 + 1), 10);
				
					//alert(x1 + "x" + y1);

					var underscore2 = id2.indexOf("_");
					var cross2 = id2.indexOf("x");
					var x2 = parseInt(id2.substring(underscore2 + 1, cross2), 10);
					var y2 = parseInt(id2.substring(cross2 + 1), 10);
				
					//alert(x1 + "x" + y1);
				
					board.MoveTile({'x':x1, 'y':y1}, {'x':x2, 'y':y2});
				}
			});
			
			switch (square.Type)
			{
				case SquareType.Normal:
					var span1 = document.createElement('span');
					var txt1 = document.createTextNode(" ");
					span1.appendChild(txt1);
					a.appendChild(span1);
		
					break;
				case SquareType.DoubleWord:
					var span = document.createElement('span');
					var txt1 = document.createTextNode("DOUBLE WORD SCORE");
					
					var middle = Math.floor(board.Dimension / 2);
					if (square.X == middle && square.Y == middle)
					{
						txt1 = document.createTextNode('\u2605');
					}
					span.appendChild(txt1);
			
					a.appendChild(span);
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
	
	function DrawHtmlTable(board)
	{
		var rootDiv = document.getElementById('board');
		var table = document.createElement('table');
		rootDiv.appendChild(table);
	
		for (var y = 0; y < board.Dimension; y++)
		{
			var tr = document.createElement('tr');
			table.appendChild(tr);
		
			for (var x = 0; x < board.Dimension; x++)
			{
				var square = board.SquaresList[x + board.Dimension * y];

				var centerStart = false;
			
				var td = document.createElement('td');
				tr.appendChild(td);
				
				var middle = Math.floor(board.Dimension / 2);
				var halfMiddle = Math.ceil(middle / 2);
			
				if (square.Type == SquareType.TripleWord)
				{
					td.setAttribute('class', 'TripleWord');
				}
				else if (square.Type == SquareType.DoubleWord)
				{
					if (x == middle && y == middle)
					{
						centerStart = true;
						td.setAttribute('class', 'DoubleWord CenterStart');
					}
					else
					{
						td.setAttribute('class', 'DoubleWord');
					}
				}
				else if (square.Type == SquareType.DoubleLetter)
				{
					td.setAttribute('class', 'DoubleLetter');
				}
				else if (square.Type == SquareType.TripleLetter)
				{
					td.setAttribute('class', 'TripleLetter');
				}
				else
				{
					td.setAttribute('class', 'Normal');
				}
			
				var a = document.createElement('a');
				td.appendChild(a);
				var id = IDPrefix_SquareOrTile + x + "x" + y;
				a.setAttribute('id', id);
				
				UpdateHtmlTableCell(board, square);
			}
		}
	}

	var callback_ScrabbleBoardReady = function(eventPayload)
		{
			DrawHtmlTable(eventPayload.Board);
		};

	EventsManager.AddEventListener(Board.prototype.Event_ScrabbleBoardReady, callback_ScrabbleBoardReady);
	
	var callback_ScrabbleSquareTileChanged = function(eventPayload)
		{
			UpdateHtmlTableCell(eventPayload.Board, eventPayload.Square);
		};

	EventsManager.AddEventListener(Board.prototype.Event_ScrabbleSquareTileChanged, callback_ScrabbleSquareTileChanged);
}
} // END - with (Scrabble.Core)

return _Html;
})();
// END Scrabble.UI.Html ------------------
//=================================================

})();
// END script-scope ------------------



window_onload = function()
{

alert("DANIEL");

with (Scrabble)
{
	var board = new Core.Board(); //15 by default, 21 works well too :)
}

/*
with (Scrabble)
{
	var board = new Core.Board();
	console.log("CHECK: " + board.toString());
	
	var board1 = new Core.Board(15, 15);
	console.log("CHECK: " + board1.toString());
	
	var board2 = new Core.Board({SquaresHorizontal:15, SquaresVertical:15});
	console.log("CHECK: " + board2.toString());
	
	try
	{
		var boardEx = new Core.Board("test");
	}
	catch(e)
	{
		alert(e.message);
	}
	
	try
	{
		var boardEx = new Core.Board(["test", 15, {test: "daniel"}]);
	}
	catch(e)
	{
		alert(e.message);
	}
	
	try
	{
		var boardEx = new Core.Board(15, "test");
	}
	catch(e)
	{
		alert(e.message);
	}
	
	try
	{
		var boardEx = new Core.Board({SquaresHorizontal:15, SquaresVertical:{test:"test"}});
	}
	catch(e)
	{
		alert(e.message);
	}
}
*/

/*
var callback = function(eventPayload)
	{
		//for (var i = 0; i < eventPayload.length; i++)
		for (var key in eventPayload)
		{
			alert(key + "," + eventPayload[key]);
		}
	};
with (EventsManager)
{
AddEventListener('EVENT_NAME', callback);
DispatchEvent('EVENT_NAME', { 'key1': "value1", 'key2': "value2" });

AddEventListener('EVENT_NAME', callback);
DispatchEvent('EVENT_NAME', { '-key1': "-value1", '-key2': "-value2" });

RemoveEventListener('EVENT_NAME', callback);
DispatchEvent('EVENT_NAME', { '_key1': "_value1", '_key2': "_value2" });
}
*/

}; //END window.onload

