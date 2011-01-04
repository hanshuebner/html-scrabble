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

http://www.hasbro.com/scrabble/en_US/glossary.cfm
http://www.hasbro.com/scrabble/en_US/rulesSetup.cfm

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
	//console.log("Ensuring namespace: " + nsString);
	
	var nsStrings = nsString.split(".");
	var root = _OBJECT_ROOT_;
	for (var i = 0; i < nsStrings.length; i++)
	{
		var nsName = nsStrings[i];
		var val = root[nsName];
		if (typeof val == "undefined" || !val)
		{
			//console.log("Creating namespace object: " + nsName);
			root[nsName] = new Object(); // {} ?
		}
		else
		{
			//console.log("Namespace object already exists: " + nsName);
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
		//console.log("Event.AddEventListener - init empty callbacks for eventName: " + eventName);
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
			//console.log("Event.RemoveEventListener - unregistered: " + eventName + ", " + callback);
			//delete callbacks[i];
			callbacks.splice(i--, 1);
		}
	}
	
	if (callbacks.length == 0)
	{
		//console.log("Event.RemoveEventListener - empty callback list, removing eventName entirely: " + eventName);
		delete _EventListeners[eventName];
	}

	if (!atLeastOneRemoved)
	{
		console.log("Event.RemoveEventListener - callback for eventName not found: " + eventName + ", " + callback);
	}
};

return _EventsManager;
})();
// END EventsManager ------------------
//=================================================

EnsureNamespace("Scrabble.Core");
EnsureNamespace("Scrabble.UI");

var IDPrefix_Board_SquareOrTile = "BoardSquareOrTile_";
var IDPrefix_Rack_SquareOrTile = "RackSquareOrTile_";
var IDPrefix_Letters_SquareOrTile = "LettersSquareOrTile_";

function PlayAudio(id)
{
	var audio = document.getElementById(id);
	
	/*
	audio.load()
	audio.addEventListener("load", function() {

	}, true);
	*/

	if (audio.playing)
	{
		audio.pause();
	}
    
	audio.defaultPlaybackRate = 1;
	audio.volume = 1;
	
	try
	{
		audio.currentTime = 0;
		audio.play();
	}
	catch(e)
	{
		function currentTime()
		{
			audio.currentTime = 0;
			audio.removeEventListener("canplay", currentTime, true);
			audio.play();
		}
		audio.addEventListener("canplay", currentTime, true);
		//alert("DEBUG 2" + e.message);
	}
}


//=================================================
// BEGIN Scrabble.Core.Dictionary ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Dictionary == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Dictionary"])
_OBJECT_ROOT_.Scrabble.Core.Dictionary = (function(){
//var _Dictionary = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

//console.log("inside Scrabble.Core.Dictionary code scope");

// DAWG => Directed Acyclic Word Graph
//http://en.wikipedia.org/wiki/Directed_acyclic_word_graph
//http://eyes-free.googlecode.com/svn/trunk/ocr/src/com/android/ocr/spellcheck/Lexicon.java
//http://ngrams.googlelabs.com/datasets
//http://www.metagrams.com/view.mod/dictionaries.html
//http://eyes-free.googlecode.com/svn/trunk/ocr/src/com/android/ocr/spellcheck/Lexicon.java
//http://www.wutka.com/dawg.html

with (Scrabble.Core)
{
var _Dictionary = function(dictionaryFileURL, maxWordLength, indexedAlphabet)
{
	this.IndexedAlphabet = indexedAlphabet;
	this.MaxWordLength = maxWordLength;
	this.DAWGReader = new BinFileReader(dictionaryFileURL);
	this.DAWGReader.movePointerTo(0);
	//var NumberOfNodes = this.DAWGReader.readNumber(4);

//Below: test code, not necessary parseRecursive(1, 0); //dawg_index is NOT zero-based (start with 1)
/*
	var iterations = 0;
	var wordCount = 0;
	var currentString = [];
	for (var i = 0; i < maxWordLength; i++)
	{
		currentString.push(i + "");
	}
	function parseRecursive(dawg_index, string_index) //dawg_index is NOT zero-based (start with 1)
	{
		iterations++;
		if (iterations > 50)
		{
			//alert("max iterations");
			return;
		}
		
		var letter = DAWG_Letter(dawg_index);
		//alert("letter: " + letter);
$('#words').append('<p>----DAWG_Letter: ' + letter + '</p>');
		
		currentString[string_index] = letter;
		
		if (DAWG_IsEndOfWord(dawg_index))
		{
			wordCount++;
			
			var string = "";
			for (var i = 0; i <= string_index; i++)
			{
				string += currentString[i];
			}
			
			//alert("Full word (" + wordCount + "): " + string);
			$('#words').append('<p>' + string + " (" + wordCount + ")" + '</p>');

			if (wordCount > 10)
			{
				//alert("max words");
				return;
			}
		}
		
		var childIndex = DAWG_ChildIndex(dawg_index);
		//alert("DAWG_ChildIndex: " + childIndex);
		if (childIndex > 0)
		{
$('#words').append('<p>----DAWG_ChildIndex</p>');
			DAWG_ParseRecursive(childIndex, string_index+1);
		}
		
		var nextIndex = DAWG_NextIndex(dawg_index);
		//alert("DAWG_NextIndex: " + nextIndex);
		if (nextIndex > 0)
		{
$('#words').append('<p>----DAWG_NextIndex</p>');
			DAWG_ParseRecursive(nextIndex, string_index);
		}
	}
	*/
}

_Dictionary.prototype.LETTER_BIT_SHIFT = 25;
_Dictionary.prototype.LETTER_BIT_MASK = 1040187392;
_Dictionary.prototype.CHILD_INDEX_BIT_MASK = 33554431;
_Dictionary.prototype.END_OF_WORD_BIT_MASK = 2147483648;
_Dictionary.prototype.END_OF_LIST_BIT_MASK = 1073741824;

_Dictionary.prototype.DAWGReader = 0;
_Dictionary.prototype.IndexedAlphabet = "";
_Dictionary.prototype.MaxWordLength = 0;

var DAWG_OFFSET = 4; //4 bytes initial data at top of file, stores the number of nodes in the DAWG

_Dictionary.prototype.DAWG_Letter = function(dataIndex)
{
	var byteOffset = 4 * dataIndex + DAWG_OFFSET;
	this.DAWGReader.movePointerTo(byteOffset);
	
	var alphabetPos = ((this.DAWGReader.readNumber(4) & this.LETTER_BIT_MASK) >> this.LETTER_BIT_SHIFT);
	var letter = this.IndexedAlphabet.substring(alphabetPos, alphabetPos+1);
	return letter;
}
_Dictionary.prototype.DAWG_IsEndOfWord = function(dataIndex)
{
	var byteOffset = 4 * dataIndex + DAWG_OFFSET;
	this.DAWGReader.movePointerTo(byteOffset);

	var val = (this.DAWGReader.readNumber(4) & this.END_OF_WORD_BIT_MASK);
	return val == 0 ? false : true;
}
_Dictionary.prototype.DAWG_NextIndex = function(dataIndex)
{
	var byteOffset = 4 * dataIndex + DAWG_OFFSET;
	this.DAWGReader.movePointerTo(byteOffset);
	
	var val = (this.DAWGReader.readNumber(4) & this.END_OF_LIST_BIT_MASK);
	return val == 0 ? (dataIndex + 1) : 0;
}
_Dictionary.prototype.DAWG_ChildIndex = function(dataIndex)
{
	var byteOffset = 4 * dataIndex + DAWG_OFFSET;
	this.DAWGReader.movePointerTo(byteOffset);
	
	var val = (this.DAWGReader.readNumber(4) & this.CHILD_INDEX_BIT_MASK);
	return val;
}

_Dictionary.prototype.CheckDictionaryRecursive = function(theWord, string_index, dawg_index) //dawg_index is NOT zero-based (start with 1)
{
	var ch = theWord[string_index];
	var letter = this.DAWG_Letter(dawg_index);
	if (letter == ch)
	{
		if (string_index == (theWord.length - 1))
		{
			if (this.DAWG_IsEndOfWord(dawg_index))
			{
				return true;
			}
			else
			{
				return false;
			}
		}
		else
		{
			var childIndex = this.DAWG_ChildIndex(dawg_index);
			if (childIndex > 0)
			{
				return this.CheckDictionaryRecursive(theWord, string_index+1, childIndex);
			}
			else
			{
				return false;
			}
		}
	}
	else
	{
		var nextIndex = this.DAWG_NextIndex(dawg_index);
		if (nextIndex > 0)
		{
			return this.CheckDictionaryRecursive(theWord, string_index, nextIndex);
		}
		else
		{
			return false;
		}
	}
}

_Dictionary.prototype.CheckWord = function(theWord)
{
	theWord = theWord.toUpperCase();
	return this.CheckDictionaryRecursive(theWord, 0, 1); //dawg_index is NOT zero-based (start with 1)
}

var currentString = [];
var sortedChars = [];

_Dictionary.prototype.FindAnagramsRecursive = function(dawg_index, string_index) //dawg_index is NOT zero-based (start with 1)
{
	var retArray = [];
	
	var previousChar = 0;
	var tempIndex = this.DAWG_ChildIndex(dawg_index);
	
	currentString[string_index] = this.DAWG_Letter(dawg_index);

	if (this.DAWG_IsEndOfWord(dawg_index))
	{
		var string = "";
		for (var i = 0; i <= string_index; i++)
		{
			string += currentString[i];
		}
		
		retArray.push(string);
	}

	if ((sortedChars.length > 0) && (tempIndex > 0))
	{
		var string = "";
		for (var i = 0; i < sortedChars.length; i++)
		{
			string += sortedChars[i];
		}

		for (var i = 0; i < sortedChars.length; i++)
		{
			var currentChar = sortedChars[i];
			if (currentChar == previousChar) continue;
			
			do
			{
				var tempLetter = this.DAWG_Letter(tempIndex);
				if (currentChar == tempLetter)
				{
					sortedChars.splice(i, 1);
					var retAr = this.FindAnagramsRecursive(tempIndex, string_index + 1);
					retArray = retArray.concat(retAr);
					sortedChars.splice(i, 0, currentChar);
					
					tempIndex = this.DAWG_NextIndex(tempIndex);
					break;
				}
				else
				{
					var alphabetPos1 = this.IndexedAlphabet.indexOf(currentChar);
					var alphabetPos2 = this.IndexedAlphabet.indexOf(tempLetter);
					
					if (alphabetPos1 < alphabetPos2) break;
				}
				
				tempIndex = this.DAWG_NextIndex(tempIndex);
				
			} while (tempIndex > 0);
			
			if (tempIndex <= 0) break;
			
			previousChar = currentChar;
		}
	}
	
	return retArray;
}

_Dictionary.prototype.FindAnagrams = function(theChars)
{	
	theChars = theChars.toUpperCase();

	// RESET currentString
	for (var i = 0; i < currentString.length; i++)
	{
		//delete callbacks[i];
		currentString.splice(i--, 1);
	}
	for (var i = 0; i < this.MaxWordLength; i++)
	{
		currentString.push(i + "");
	}

	// RESET sortedChars
	for (var i = 0; i < sortedChars.length; i++)
	{
		//delete callbacks[i];
		sortedChars.splice(i--, 1);
	}
	for (var i = 0; i < theChars.length; i++)
	{
		var aChar = theChars[i];
		if (this.IndexedAlphabet.indexOf(aChar) >= 0)
		{
			sortedChars.push(aChar);
		}
	}
	sortedChars.sort();
	//alert(sortedChars.join(" "));
	
	var string = "";
	for (var i = 0; i < sortedChars.length; i++)
	{
		string += sortedChars[i];
	}
	
	if (sortedChars.length < 2)
	{
		return [string];
	}
	
	var anagrams = [string]; 

	var charBank = [];
	for (var i = 0; i < sortedChars.length; i++)
	{
		charBank.push(sortedChars[i]);
	}
	
	var previousChar = 0;
	
	for (var i = 0; i < charBank.length; i++)
	{
		var currentChar = charBank[i];
		
		if (currentChar == previousChar)
		{
			continue;
		}
		
		sortedChars.splice(i, 1);
		
		var dawg_index = this.IndexedAlphabet.indexOf(currentChar) + 1; //dawg_index is NOT zero-based (start with 1)
		
		var retAr = this.FindAnagramsRecursive(dawg_index, 0, sortedChars.length);
		anagrams = anagrams.concat(retAr);
		
		sortedChars.splice(i, 0, currentChar);
		
		previousChar = currentChar;
	}
	
	return anagrams;
}

} // END - with (Scrabble.Core)

return _Dictionary;
})();
// END Scrabble.Core.Dictionary ------------------
//=================================================


//=================================================
// BEGIN Scrabble.Core.Tile ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Tile == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Tile"])
_OBJECT_ROOT_.Scrabble.Core.Tile = (function(){

//console.log("inside Scrabble.Core.Tile code scope");

with (Scrabble.Core)
{

//function _Tile()
var _Tile = function()
{
	this.Letter = arguments[0];
	this.Score = arguments[1];
	
	if (this.Letter == this.BlankLetter)
	{
		this.IsBlank = true;
	}
}

_Tile.prototype.BlankLetter = "-";

_Tile.prototype.Letter = '';
_Tile.prototype.IsBlank = false;
_Tile.prototype.Score = 0;
_Tile.prototype.Placed = false;

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

//console.log("inside Scrabble.Core.Square code scope");

with (Scrabble.Core)
{

//function _Square()
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
_Square.prototype.TileLocked = false;

_Square.prototype.PlaceTile = function(tile, locked)
{
	if (this.Tile != 0)
	{
		this.Tile.Placed = false;
	}

	this.Tile = tile;
	this.TileLocked = locked;

	if (tile != 0)
	{
		if (tile.Placed)
		{
			alert("Tile shouldn't already be placed on board or rack !! => " + tile);
		}
		tile.Placed = true;
	}
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

//console.log("inside Scrabble.Core.Board code scope");

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

	function SetDimension(val)
	{
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
				//console.log("typeof ARGS: " + typeof arguments[0]);
				//console.log("typeof ARGS: " + type_of(arguments[0]));
			
				switch (type_of(arguments[0]))
				{
					case 'number':
						SetDimension.apply(this, [arguments[0]]);
						//console.log("Scrabble.Core.Board 'number' constructor: " + this.toString());
						return;
					case 'object':
						SetDimension.apply(this, [arguments[0]['Dimension']]);
						//console.log("Scrabble.Core.Board 'object' constructor: " + this.toString());
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
				//console.log("Scrabble.Core.Board constructor with empty parameters (default "+this.Dimension+"x"+this.Dimension+")");
			}
		}
		else
		{
			throw new Error('Illegal method call Scrabble.Core.Board.SetDimensions() on :' + typeof this);
		}
	}
	
	//console.log("Scrabble.Core.Board constructor before applying parameters");
	SetDimensions.apply(this, arguments);
	//SetDimensions(arguments);
	
	CreateGrid.apply(this);
}

_Board.prototype.Event_ScrabbleBoardReady = "ScrabbleBoardReady";
_Board.prototype.Event_ScrabbleBoardSquareTileChanged = "ScrabbleBoardSquareTileChanged";
_Board.prototype.Event_ScrabbleBoardSquareStateChanged = "ScrabbleBoardSquareStateChanged";

_Board.prototype.Dimension = NaN;

_Board.prototype.SquaresList = [];

_Board.prototype.Game = 0;

_Board.prototype.CheckDictionary = function()
{
	var word = "";
	var wordSquares = [];
	
	var validHorizontalWords = [];
	var validVerticalWords = [];

	var invalidSquares = [];

	var middle = Math.floor(this.Dimension / 2);
	var square = this.SquaresList[middle + this.Dimension * middle];
	if (square.Tile == 0)
	{
		EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 1 });
	
		invalidSquares.push(square);
	}

	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var square = this.SquaresList[x + this.Dimension * y];
			if (square.Tile != 0)
			{
				wordSquares.push(square);
				word += square.Tile.Letter;
			}
			else
			{
				if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word))
				{
					for (var i = 0; i < wordSquares.length; i++)
					{
						var square = wordSquares[i];
						var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
						var td = document.getElementById(id).parentNode;
						
						//$(td).addClass("Invalid");
						EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 1 });
						
						invalidSquares.push(square);
					}
				}
				else
				{
					var newArray = wordSquares.slice();
					validHorizontalWords.push(newArray);
				}
				
				word = "";
				wordSquares = [];
			}
		}
	}
	
	for (var x = 0; x < this.Dimension; x++)
	{
		for (var y = 0; y < this.Dimension; y++)
		{
			var square = this.SquaresList[x + this.Dimension * y];
			if (square.Tile != 0)
			{
				wordSquares.push(square);
				word += square.Tile.Letter;
			}
			else
			{
				if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word))
				{
					for (var i = 0; i < wordSquares.length; i++)
					{
						var square = wordSquares[i];
						var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
						var td = document.getElementById(id).parentNode;
						
						$(td).addClass("Invalid");
						EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 1 });
						
						invalidSquares.push(square);
					}
				}
				else
				{
					var newArray = wordSquares.slice();
					validVerticalWords.push(newArray);
				}
				
				word = "";
				wordSquares = [];
			}
		}
	}

	for (var i = 0; i < validHorizontalWords.length; i++)
	{
		wordSquares = validHorizontalWords[i];
		for (var j = 0; j < wordSquares.length; j++)
		{
			var square = wordSquares[j];
			var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
			var td = document.getElementById(id).parentNode;
			//$(td).removeClass("Invalid");
			//$(td).addClass("Valid");
			EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 0 });
			
			for (var k = 0; k < invalidSquares.length; k++)
			{
				if (invalidSquares[k] == square)
				{
					invalidSquares.splice(k--, 1);
				}
			}
		}
	}
	
	for (var i = 0; i < validVerticalWords.length; i++)
	{
		wordSquares = validVerticalWords[i];
		
		for (var j = 0; j < wordSquares.length; j++)
		{
			var square = wordSquares[j];
			//TODO: check if there is a path to the center square
			//TODO: check played tiles (!Tile.Locked) are vertical XOR horizontal, and without gaps
			//EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 2 });
		}
		
		for (var j = 0; j < wordSquares.length; j++)
		{
			var square = wordSquares[j];
			var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
			var td = document.getElementById(id).parentNode;
			//$(td).removeClass("Invalid");
			//$(td).addClass("Valid");
			EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareStateChanged, { 'Board': this, 'Square': square, 'State': 0 });
			
			for (var k = 0; k < invalidSquares.length; k++)
			{
				if (invalidSquares[k] == square)
				{
					invalidSquares.splice(k--, 1);
				}
			}
		}
	}

	return invalidSquares.length == 0;
}

_Board.prototype.RemoveFreeTiles = function()
{
	var tiles = [];
	
	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var square = this.SquaresList[x + this.Dimension * y];
		
			if (square.Tile != 0 && !square.Tile.Locked)
			{
				tiles.push(square.Tile);
				
				square.PlaceTile(0, false);
			
				EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
			}
		}
	}
	
	return tiles;
}

_Board.prototype.EmptyTiles = function()
{
	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var square = this.SquaresList[x + this.Dimension * y];
		
			square.PlaceTile(0, false);
			
			EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
		}
	}
}

_Board.prototype.MoveTile = function(tileXY, squareXY)
{
	if (tileXY.y == -1 || squareXY.y == -1)
	{
		if (this.Game != 0)
		{
			this.Game.MoveTile(tileXY, squareXY);
		}
		
		return;
	}
	
	var square1 = this.SquaresList[tileXY.x + this.Dimension * tileXY.y];
	var square2 = this.SquaresList[squareXY.x + this.Dimension * squareXY.y];

	var tile = square1.Tile;
	square1.PlaceTile(0, false);
	square2.PlaceTile(tile, false);

	//var random = Math.floor(Math.random()*3);
	//var audio = document.getElementById(square2.Type == SquareType.Normal ? 'audio2' : 'audio3');
	//var audio = document.getElementById('audio' + (random+1));
	PlayAudio('audio4');
	
	EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square1 });
	EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square2 });
}

_Board.prototype.GenerateTilesLetterDistribution = function()
{
	PlayAudio('audio0');
	
	this.Game.Rack.EmptyTiles();
	this.EmptyTiles();
	
	var letterDistribution = 0;
	for (var i = 0; i < this.Game.LetterDistributions.length; ++i)
	{
		var ld = this.Game.LetterDistributions[i];
		if (ld.Language == this.Game.Language)
		{
			letterDistribution = ld;
		}
	}
	
	var i = -1;
	
	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			i++;
			
			var centerStart = false;
		
			var square = this.SquaresList[x + this.Dimension * y];
		
			var middle = Math.floor(this.Dimension / 2);
			var halfMiddle = Math.ceil(middle / 2);

			if (i < letterDistribution.Tiles.length)
			{
				var locked = 1; // Math.floor(Math.random() * 2);
				var tile = letterDistribution.Tiles[i];
				square.PlaceTile(tile, locked == 1 ? true : false);
			
				EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
			}
			else if (square.Tile != 0)
			{
				square.PlaceTile(0, false);
				
				EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
			}
		}
	}
}

_Board.prototype.GenerateRandomTiles = function()
{
	PlayAudio('audio0');
	
	board.EmptyTiles();
	
	var totalPlaced = 0;
	
	for (var y = 0; y < this.Dimension; y++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var centerStart = false;
		
			var square = this.SquaresList[x + this.Dimension * y];
		
			var middle = Math.floor(this.Dimension / 2);
			var halfMiddle = Math.ceil(middle / 2);
		
			var makeTile = Math.floor(Math.random()*2);
			if (makeTile) // && y <= middle)
			{
				/*
				var letters = Tile.prototype.BlankLetter + "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				var letter_index = Math.floor(Math.random() * letters.length);
				var letter = letters.substring(letter_index, letter_index+1);
			
				var score = Math.floor(Math.random()*10) + 1;
				if (letter == Tile.prototype.BlankLetter) score = 0;
			
				var tile = new Tile(letter, score);
				*/
				
				var letterDistribution = 0;
				for (var i = 0; i < this.Game.LetterDistributions.length; ++i)
				{
					var ld = this.Game.LetterDistributions[i];
					if (ld.Language == this.Game.Language)
					{
						letterDistribution = ld;
					}
				}

				var lastFreeTile = -1;
				for (var i = 0; i < letterDistribution.Tiles.length; ++i)
				{
					var tile = letterDistribution.Tiles[i];
					if (!tile.Placed)
					{
						lastFreeTile = i;
					}
				}

				if (lastFreeTile == -1)
				{
					//alert("No free tiles ! TOTAL placed: " + totalPlaced);
					// TODO: end of game ! :)
					return;
				}

				var tile_index = 1000;
				while (tile_index > lastFreeTile)
				{
					tile_index = Math.floor(Math.random() * letterDistribution.Tiles.length);
				}

				var tile = 0;
				do
				{
					tile = letterDistribution.Tiles[tile_index++];
				}
				while (tile.Placed && tile_index < letterDistribution.Tiles.length);

				if (tile == 0 || tile.Placed)
				{
					alert("No free tiles ! (WTF ?)");
					return;
				}
				
				totalPlaced++;
				
				var locked = 0; // Math.floor(Math.random() * 2);
				square.PlaceTile(tile, locked == 1 ? true : false);
			
				EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
			}
			else if (square.Tile != 0)
			{
				square.PlaceTile(0, false);
				
				EventsManager.DispatchEvent(this.Event_ScrabbleBoardSquareTileChanged, { 'Board': this, 'Square': square });
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


//=================================================
// BEGIN Scrabble.Core.Rack ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Rack == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Rack"])
_OBJECT_ROOT_.Scrabble.Core.Rack = (function(){
//var _Rack = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

//console.log("inside Scrabble.Core.Rack code scope");

with (Scrabble.Core)
{

//function _Rack()
var _Rack = function()
{
	function CreateGrid()
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			//SquareType.Normal, SquareType.DoubleLetter, SquareType.DoubleWord, SquareType.TripleLetter, SquareType.TripleWord
			var square = new Square(SquareType.Normal);
			square.X = x;
			square.Y = -1;
			this.SquaresList.push(square);
		}
		
		EventsManager.DispatchEvent(this.Event_ScrabbleRackReady, { 'Rack': this });
	}

	//_Rack.prototype.SetDimension = function()
	function SetDimension()
	{
		if (this instanceof _Rack)
		{
			if (arguments.length > 0)
			{
				//console.log("typeof ARGS: " + typeof arguments[0]);
				//console.log("typeof ARGS: " + type_of(arguments[0]));
			
				switch (type_of(arguments[0]))
				{
					case 'number':
						var val = arguments[0];

						if (val < 7)
							throw new Error("Illegal argument Scrabble.Core.Rack.SetDimension(), number smaller than 7: " + val);

						this.Dimension = val;
						//console.log("Scrabble.Core.Rack 'number' constructor: " + this.toString());
						return;
					case 'object':
					case 'array':
					default:
						var argumentsString = "";
						for (var i = 0; i < arguments.length; i++)
						{
							argumentsString += arguments[0] + ", ";
						}
						throw new Error("Illegal arguments Scrabble.Core.Rack.SetDimension(): " + argumentsString);
						break;
				}
			}
			else
			{
				this.Dimension = 8;
				//console.log("Scrabble.Core.Rack constructor with empty parameters (default "+this.Dimension+")");
			}
		}
		else
		{
			throw new Error('Illegal method call Scrabble.Core.Rack.SetDimensions() on :' + typeof this);
		}
	}
	
	//console.log("Scrabble.Core.Rack constructor before applying parameters");
	SetDimension.apply(this, arguments);
	//SetDimensions(arguments);
	
	CreateGrid.apply(this);
}

_Rack.prototype.Event_ScrabbleRackReady = "ScrabbleRackReady";
_Rack.prototype.Event_ScrabbleRackSquareTileChanged = "ScrabbleRackSquareTileChanged";

_Rack.prototype.Dimension = NaN;

_Rack.prototype.SquaresList = [];

_Rack.prototype.Game = 0;

_Rack.prototype.TakeTilesBack = function()
{
	var freeTilesCount = 0;
	for (var x = 0; x < this.Dimension; x++)
	{
		var square = this.SquaresList[x];
		if (square.Tile == 0)
		{
			freeTilesCount++;
		}
	}
	
	freeTilesCount--;
	if (freeTilesCount <= 0) return;
	
	var tiles = this.Game.Board.RemoveFreeTiles();
	var count = tiles.length;

	if (count > freeTilesCount)
	{
		count = freeTilesCount;
	}
	
	for (var i = 0; i < count; i++)
	{
		for (var x = 0; x < this.Dimension; x++)
		{
			var square = this.SquaresList[x];
			if (square.Tile == 0)
			{
				square.PlaceTile(tiles[i], false);

				EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
				
				break;
			}
		}
	}
}

_Rack.prototype.EmptyTiles = function()
{
	for (var x = 0; x < this.Dimension; x++)
	{
		var square = this.SquaresList[x];
		
		square.PlaceTile(0, false);

		EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
	}
}

_Rack.prototype.MoveTile = function(tileXY, squareXY)
{
	if (tileXY.y != -1 || squareXY.y != -1)
	{
		if (this.Game != 0)
		{
			this.Game.MoveTile(tileXY, squareXY);
		}
		
		return;
	}
	
	var square1 = this.SquaresList[tileXY.x];
	var square2 = this.SquaresList[squareXY.x];

	var tile = square1.Tile;
	square1.PlaceTile(0, false);
	square2.PlaceTile(tile, false);

	//var random = Math.floor(Math.random()*3);
	//var audio = document.getElementById(square2.Type == SquareType.Normal ? 'audio2' : 'audio3');
	//var audio = document.getElementById('audio' + (random+1));
	PlayAudio('audio4');
	
	EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square1 });
	EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square2 });
}

_Rack.prototype.GetRandomFreeTile = function()
{
	var letterDistribution = 0;
	for (var i = 0; i < this.Game.LetterDistributions.length; ++i)
	{
		var ld = this.Game.LetterDistributions[i];
		if (ld.Language == this.Game.Language)
		{
			letterDistribution = ld;
		}
	}
	
	var lastFreeTile = -1;
	for (var i = 0; i < letterDistribution.Tiles.length; ++i)
	{
		var tile = letterDistribution.Tiles[i];
		if (!tile.Placed)
		{
			lastFreeTile = i;
		}
	}
	
	if (lastFreeTile == -1)
	{
		alert("No free tiles !"); // TODO: end of game ! :)
		return 0;
	}
	
	var tile_index = 1000;
	while (tile_index > lastFreeTile)
	{
		tile_index = Math.floor(Math.random() * letterDistribution.Tiles.length);
	}
	
	var tile = 0;
	do
	{
		tile = letterDistribution.Tiles[tile_index++];
	}
	while (tile.Placed && tile_index < letterDistribution.Tiles.length);
	
	if (tile == 0 || tile.Placed)
	{
		alert("No free tiles ! (WTF ?)");
		return 0;
	}
	
	return tile;
}

_Rack.prototype.ReplenishRandomTiles = function()
{
	var existingTiles = [];
	for (var x = 0; x < this.Dimension; x++)
	{
		var square = this.SquaresList[x];
		if (square.Tile != 0)
		{
			existingTiles.push(square.Tile);
		}
	}

	this.EmptyTiles();
	
	for (var x = 0; x < existingTiles.length; x++)
	{
		var square = this.SquaresList[x];
		square.PlaceTile(existingTiles[x], false);
		EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
	}
	
	for (var x = existingTiles.length; x < (this.Dimension-1); x++)
	{
		var square = this.SquaresList[x];
		
		var tile = this.GetRandomFreeTile();
		if (tile == 0) return;
		
		square.PlaceTile(tile, false);
	
		EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
	}
}

_Rack.prototype.GenerateRandomTiles = function()
{
	rack.EmptyTiles();

	for (var x = 0; x < (this.Dimension - 1); x++)
	{
		var square = this.SquaresList[x];
		
		
		/*
		var letters = Tile.prototype.BlankLetter + "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		var letter_index = Math.floor(Math.random() * letters.length);
		var letter = letters.substring(letter_index, letter_index+1);
	
		var score = Math.floor(Math.random()*10) + 1;
		if (letter == Tile.prototype.BlankLetter) score = 0;
	
		if (x == 0)
		{
			letter = Tile.prototype.BlankLetter;
			score = 0;
		}
	
		var tile = new Tile(letter, score);
		*/
		
		var tile = this.GetRandomFreeTile();
		if (tile == 0) return;
		
		square.PlaceTile(tile, false);
	
		EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
	}
	
	var square = this.SquaresList[this.Dimension - 1];
	if (square.Tile != 0)
	{
		square.PlaceTile(0, false);
		
		EventsManager.DispatchEvent(this.Event_ScrabbleRackSquareTileChanged, { 'Rack': this, 'Square': square });
	}
}


_Rack.prototype.toString = function()
{
	return "Scrabble.Core.Rack toString(): " + this.Dimension;
}

} // END - with (Scrabble.Core)

return _Rack;
})();
// END Scrabble.Core.Rack ------------------
//=================================================


//=================================================
// BEGIN Scrabble.Core.Rack ------------------
if (typeof _OBJECT_ROOT_.Scrabble.Core.Game == "undefined" || !_OBJECT_ROOT_.Scrabble.Core["Game"])
_OBJECT_ROOT_.Scrabble.Core.Game = (function(){
//var _Game = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

//console.log("inside Scrabble.Core.Game code scope");

with (Scrabble.Core)
{
	
//function _Game()
var _Game = function(board, rack)
{
	//console.log("Scrabble.Core.Game constructor");
	
	this.Board = board;
	board.Game = this;
	
	this.Rack = rack;
	rack.Game = this;
	
	function initLetterDistributions_()
	{
		var data = arguments[0];
		var language = arguments[1];
		
		var tiles = [];
		var letters = [];
		
		for (var i = 0; i < data.length; ++i)
		{
			var item = data[i];
			
			var tile = new Tile(item.Letter, item.Score);
			letters.push(tile);
			
			for (var n = 0; n < item.Count; ++n)
			{
				var tile = new Tile(item.Letter, item.Score);
				tiles.push(tile);
			}
		}
		
		letters.sort(function(a,b){ 
		  var a = a.Letter;
		  var b = b.Letter;

		  if (a < b) return -1;
		  if (a > b) return 1;
		  return 0;
		});
		
		this.LetterDistributions.push({Language: language, Tiles: tiles, Letters: letters});
	}
	
	function initLetterDistributions_English()
	{
		var data = [
		{Letter: Tile.prototype.BlankLetter, Score: 0, Count: 2},
		
		{Letter: "E", Score: 1, Count: 12},
		{Letter: "A", Score: 1, Count: 9},
		{Letter: "I", Score: 1, Count: 9},
		{Letter: "O", Score: 1, Count: 8},
		{Letter: "N", Score: 1, Count: 6},
		{Letter: "R", Score: 1, Count: 6},
		{Letter: "T", Score: 1, Count: 6},
		{Letter: "L", Score: 1, Count: 4},
		{Letter: "S", Score: 1, Count: 4},
		{Letter: "U", Score: 1, Count: 4},
		
		{Letter: "D", Score: 2, Count: 4},
		{Letter: "G", Score: 2, Count: 3},
		
		{Letter: "B", Score: 3, Count: 2},
		{Letter: "C", Score: 3, Count: 2},
		{Letter: "M", Score: 3, Count: 2},
		{Letter: "P", Score: 3, Count: 2},
		
		{Letter: "F", Score: 4, Count: 2},
		{Letter: "H", Score: 4, Count: 2},
		{Letter: "V", Score: 4, Count: 2},
		{Letter: "W", Score: 4, Count: 2},
		{Letter: "Y", Score: 4, Count: 2},
		
		{Letter: "K", Score: 5, Count: 1},
		
		{Letter: "J", Score: 8, Count: 1},
		{Letter: "X", Score: 8, Count: 1},
		
		{Letter: "Q", Score: 10, Count: 1},
		{Letter: "Z", Score: 10, Count: 1}
		];
		
		initLetterDistributions_.apply(this, [data, "English"]);
	}
	
	function initLetterDistributions_French()
	{
		var data = [
		{Letter: Tile.prototype.BlankLetter, Score: 0, Count: 2},
		
		{Letter: "E", Score: 1, Count: 15},
		{Letter: "A", Score: 1, Count: 9},
		{Letter: "I", Score: 1, Count: 8},
		{Letter: "N", Score: 1, Count: 6},
		{Letter: "O", Score: 1, Count: 6},
		{Letter: "R", Score: 1, Count: 6},
		{Letter: "S", Score: 1, Count: 6},
		{Letter: "T", Score: 1, Count: 6},
		{Letter: "U", Score: 1, Count: 6},
		{Letter: "L", Score: 1, Count: 5},
		
		{Letter: "D", Score: 2, Count: 3},
		{Letter: "G", Score: 2, Count: 2},
		{Letter: "M", Score: 3, Count: 3},
		
		{Letter: "B", Score: 3, Count: 2},
		{Letter: "C", Score: 3, Count: 2},
		{Letter: "P", Score: 3, Count: 2},
		
		{Letter: "F", Score: 4, Count: 2},
		{Letter: "H", Score: 4, Count: 2},
		{Letter: "V", Score: 4, Count: 2},
				
		{Letter: "J", Score: 8, Count: 1},
		{Letter: "Q", Score: 8, Count: 1},

		{Letter: "K", Score: 10, Count: 1},
		{Letter: "W", Score: 10, Count: 1},
		{Letter: "X", Score: 10, Count: 1},
		{Letter: "Y", Score: 10, Count: 1},
		{Letter: "Z", Score: 10, Count: 1}
		];
		
		initLetterDistributions_.apply(this, [data, "French"]);
	}
	
	// TODO: parse data from JSON ?
	initLetterDistributions_French.apply(this);
	initLetterDistributions_English.apply(this);
	
	this.SetLanguage("French");
}

_Game.prototype.Dictionary = 0;

_Game.prototype.Event_ScrabbleLetterTilesReady = "ScrabbleLetterTilesReady";
//_Game.prototype.SquaresList = [];

_Game.prototype.Board = 0;
_Game.prototype.Rack = 0;

_Game.prototype.LetterDistributions = [];

_Game.prototype.SquareBlankLetterInWaitingBoard = 0;
_Game.prototype.SquareBlankLetterInWaitingRack = 0;

_Game.prototype.Language = "";


_Game.prototype.SetLanguage = function(language)
{
	if (language == "French")
	{
		this.Language = language;
		EventsManager.DispatchEvent(this.Event_ScrabbleLetterTilesReady, { 'Game': this });
		
		this.Dictionary = new Dictionary("DAWG_ODS5_French.dat", this.Board.Dimension, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
	}
	else if (language == "English")
	{
		this.Language = language;
		EventsManager.DispatchEvent(this.Event_ScrabbleLetterTilesReady, { 'Game': this });
		
		this.Dictionary = new Dictionary("DAWG_SOWPODS_English.dat", this.Board.Dimension, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
	}
	else
	{
		throw new Error("Unsupported language: " + language);
	}
}

_Game.prototype.MoveTile = function(tileXY, squareXY)
{
	if (tileXY.y == -1 && squareXY.y == -1)
	{
		this.Rack.MoveTile(tileXY, squareXY);
		return;
	}
	
	if (tileXY.y != -1 && squareXY.y != -1)
	{
		this.Board.MoveTile(tileXY, squareXY);
		return;
	}
	
	if (tileXY.y == -1) // RACK to BOARD
	{
		var square1 = this.Rack.SquaresList[tileXY.x];
		var square2 = this.Board.SquaresList[squareXY.x + this.Board.Dimension * squareXY.y];
		
		var tile = square1.Tile;
		square1.PlaceTile(0, false);
		square2.PlaceTile(tile, false);

		//var random = Math.floor(Math.random()*3);
		//var audio = document.getElementById(square2.Type == SquareType.Normal ? 'audio2' : 'audio3');
		//var audio = document.getElementById('audio' + (random+1));
		PlayAudio('audio4');
		
		EventsManager.DispatchEvent(this.Rack.Event_ScrabbleRackSquareTileChanged, { 'Rack': this.Rack, 'Square': square1 });
		EventsManager.DispatchEvent(this.Board.Event_ScrabbleBoardSquareTileChanged, { 'Board': this.Board, 'Square': square2 });
		
		return;
	}
	
	if (squareXY.y == -1) // BOARD to RACK
	{
		var square1 = this.Board.SquaresList[tileXY.x + this.Board.Dimension * tileXY.y];
		var square2 = this.Rack.SquaresList[squareXY.x];
		
		var tile = square1.Tile;
		square1.PlaceTile(0, false);
		square2.PlaceTile(tile, false);

		//var random = Math.floor(Math.random()*3);
		//var audio = document.getElementById(square2.Type == SquareType.Normal ? 'audio2' : 'audio3');
		//var audio = document.getElementById('audio' + (random+1));
		PlayAudio('audio4');
		
		EventsManager.DispatchEvent(this.Board.Event_ScrabbleBoardSquareTileChanged, { 'Board': this.Board, 'Square': square1 });
		EventsManager.DispatchEvent(this.Rack.Event_ScrabbleRackSquareTileChanged, { 'Rack': this.Rack, 'Square': square2 });
		
		return;
	}
}

_Game.prototype.toString = function()
{
	return "Scrabble.Core.Game toString(): TODO ... ";
}

} // END - with (Scrabble.Core)

return _Game;
})();
// END Scrabble.Core.Game ------------------
//=================================================


//=================================================
// BEGIN Scrabble.UI.Html ------------------
if (typeof _OBJECT_ROOT_.Scrabble.UI.Html == "undefined" || !_OBJECT_ROOT_.Scrabble.UI["Html"])
_OBJECT_ROOT_.Scrabble.UI.Html = (function(){
//var _Html = {}; // 'this' object (to be returned at the bottom of the containing auto-evaluated function)

//console.log("inside Scrabble.UI.Html code scope");

with (Scrabble.Core)
{
var _Html = function()
{
	function UpdateHtmlTableCellState(html, board, square, state)
	{
		var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
		var td = document.getElementById(id).parentNode;
		$(td).removeClass("Invalid");
		$(td).removeClass("Valid");
		$(td).removeClass("ValidButWrongPlacement");
		
		if (state == 0)
		{
			$(td).addClass("Valid");
		}
		else if (state == 1)
		{
			$(td).addClass("Invalid");
		}
		else if (state == 2)
		{
			$(td).addClass("ValidButWrongPlacement");
		}
	}
	
	function UpdateHtmlTableCell_Board(html, board, square)
	{
		var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
		var td = document.getElementById(id).parentNode;
		if (td.hasChildNodes())
		{
			while (td.childNodes.length >= 1)
			{
				td.removeChild(td.firstChild);
		    }
		}
		
		var div = document.createElement('div');
		td.appendChild(div);
		div.setAttribute('id', id);
		
		var a = document.createElement('a');
		div.appendChild(a);

		if (square.Tile != 0)
		{
			//td.setAttribute('class', td.getAttribute('class') + ' Tile');
			div.setAttribute('class', (square.TileLocked ? 'Tile Locked' : 'Tile Temp')
									+ (square.Tile.IsBlank ? " BlankLetter" : ""));
			
			if (!square.TileLocked)
			{
			$(div).click(
				function () {
					var id1 = $(this).attr("id");
					var underscore1 = id1.indexOf("_");
					var cross1 = id1.indexOf("x");
					var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
					var y1 = parseInt(id1.substring(cross1 + 1), 10);
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var sourceInRack = html.CurrentlySelectedSquare.Y == -1;
						
						var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;

						var divz = document.getElementById(idSelected);

						$(divz).removeClass("Selected");
						
						if (x1 == html.CurrentlySelectedSquare.X && y1 == html.CurrentlySelectedSquare.Y)
						{
							PlayAudio("audio1");
						
							html.SetCurrentlySelectedSquareUpdateTargets(0);
							//html.CurrentlySelectedSquare = 0;
							return;
						}
					}
					
					PlayAudio("audio3");
					
					html.SetCurrentlySelectedSquareUpdateTargets(board.SquaresList[x1 + board.Dimension * y1]);
					//html.CurrentlySelectedSquare = ;
					
					$(this).addClass("Selected");
					
					if (square.Tile.IsBlank) //Letter == Tile.prototype.BlankLetter
					{
						board.Game.SquareBlankLetterInWaitingRack = 0;
						board.Game.SquareBlankLetterInWaitingBoard = square;
						
						$.blockUI({
							message: $('#letters'),
							focusInput: true,
							bindEvents: true,
							constrainTabKey: true,
							fadeIn: 0,
							fadeOut: 0,
							showOverlay: true,
							centerY: true,
							css: { position: "absolute", backgroundColor: "transparent", width: "100%", left: 0, top: $(this).offset().top, border: "none", textAlign: "center" },
							overlayCSS: { backgroundColor: '#333333', opacity: 0.7 },
							onBlock: function()
							{
								//console.log("modal activated");
							}
						}); 
						
						$('.blockOverlay').attr('title','Click to cancel');
						$('.blockOverlay').click(
							function()
							{
							$.unblockUI(
							{
								onUnblock: function()
								{
									//console.log("modal dismissed");
								}
							});
							}
						);
						//$.unblockUI();
				        //setTimeout($.unblockUI, 4000);
						/* setTimeout(function() { 
						            $.unblockUI({ 
						                onUnblock: function(){ ; } 
						            }); 
						        }, 4000);
						*/
					}
				}
			);
			$(div).mousedown( // hack needed to make the clone drag'n'drop work correctly. Damn, it breaks CSS hover !! :(
				function () {
					//$(this).css({'border' : '0.35em outset #FFF8C6'});
				}
			);
			
			var doneOnce = false;
			
			$(div).draggable({ //"#board .Tile"
				revert: "invalid",
				//cursor: "move",
				opacity: 1,
				helper: "clone",
				//snap: ".Empty",
				start: function(event, ui)
				{
					PlayAudio("audio3");
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var sourceInRack = html.CurrentlySelectedSquare.Y == -1;
						
						var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;

						var divz = document.getElementById(idSelected);
						$(divz).removeClass("Selected");
					}
					html.SetCurrentlySelectedSquareUpdateTargets(0);
					
					$(this).css({ opacity: 0.5 });
					
					$(ui.helper).animate({'font-size' : '120%'}, 300); //height : '+=10px', width : '+=10px', 
						
					$(ui.helper).addClass("dragBorder");
				},
				
				drag: function(event, ui)
				{
					if (!doneOnce)
					{
						$(ui.helper).addClass("dragBorder");
						
						doneOnce = true;
					}
					
					//$(ui.helper).css({"color": "#333333 !important"});
				},
				stop: function(event, ui)
				{
					$(this).css({ opacity: 1 });

					PlayAudio('audio5');
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
		}
		else
		{
			var middle = Math.floor(board.Dimension / 2);
			if (square.X == middle && square.Y == middle)
			{
				div.setAttribute('class', "CenterStart");
			}
			else
			{
				div.setAttribute('class', 'Empty');
			}
			
			$(div).click(
				function () {
					var id1 = $(this).attr("id");
					var underscore1 = id1.indexOf("_");
					var cross1 = id1.indexOf("x");
					var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
					var y1 = parseInt(id1.substring(cross1 + 1), 10);
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var sourceInRack = html.CurrentlySelectedSquare.Y == -1;
						
						var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;
					
						var divz = document.getElementById(idSelected);

						$(divz).removeClass("Selected");
						
						var XX = html.CurrentlySelectedSquare.X;
						var YY = html.CurrentlySelectedSquare.Y;
						
						html.SetCurrentlySelectedSquareUpdateTargets(0);
						//html.CurrentlySelectedSquare = 0;
						
						board.MoveTile({'x':XX, 'y':YY}, {'x':x1, 'y':y1});
					}
				}
			);

			$(div).droppable({ //"#board .Empty"
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
				
					var middle = Math.floor(board.Dimension / 2);
					if (square.X == middle && square.Y == middle)
					{
						var txt1 = document.createTextNode('\u2605');
						var span1 = document.createElement('span');
						span1.appendChild(txt1);
						a.appendChild(span1);
					}
					else
					{
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
	
	function DrawHtmlTable_Board(html, board)
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
					}
					
					td.setAttribute('class', 'DoubleWord');
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
			
				var div = document.createElement('div');
				td.appendChild(div);
				
				var id = IDPrefix_Board_SquareOrTile + x + "x" + y;
				div.setAttribute('id', id);
				
				var a = document.createElement('a');
				div.appendChild(a);
				
				UpdateHtmlTableCell_Board(html, board, square);
			}
		}
	}

	function UpdateHtmlTableCell_Rack(html, rack, square)
	{
		var id = IDPrefix_Rack_SquareOrTile + square.X + "x" + square.Y;
		var td = document.getElementById(id).parentNode;
		if (td.hasChildNodes())
		{
			while (td.childNodes.length >= 1)
			{
				td.removeChild(td.firstChild);
		    }
		}
		
		var div = document.createElement('div');
		td.appendChild(div);
		div.setAttribute('id', id);
		
		var a = document.createElement('a');
		div.appendChild(a);

		if (square.Tile != 0)
		{
			//td.setAttribute('class', td.getAttribute('class') + ' Tile');
			div.setAttribute('class', 'Tile Temp' + (square.Tile.IsBlank ? " BlankLetter" : ""));
			
			$(div).click(
				function () {
					var id1 = $(this).attr("id");
					var underscore1 = id1.indexOf("_");
					var cross1 = id1.indexOf("x");
					var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
					var y1 = parseInt(id1.substring(cross1 + 1), 10);
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var sourceInRack = html.CurrentlySelectedSquare.Y == -1;
						var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;
						var divz = document.getElementById(idSelected);

						$(divz).removeClass("Selected");
						
						if (sourceInRack
							&& x1 == html.CurrentlySelectedSquare.X)
						{
							PlayAudio("audio1");
						
							html.SetCurrentlySelectedSquareUpdateTargets(0);
							//html.CurrentlySelectedSquare = 0;
							return;
						}
					}
					
					PlayAudio("audio3");
					
					html.SetCurrentlySelectedSquareUpdateTargets(rack.SquaresList[x1]);
					//html.CurrentlySelectedSquare = ;
					
					$(this).addClass("Selected");
					
					
					if (square.Tile.IsBlank) //Letter == Tile.prototype.BlankLetter
					{
						board.Game.SquareBlankLetterInWaitingBoard = 0;
						board.Game.SquareBlankLetterInWaitingRack = square;
						
						$.blockUI({
							message: $('#letters'),
							focusInput: true,
							bindEvents: true,
							constrainTabKey: true,
							fadeIn: 0,
							fadeOut: 0,
							showOverlay: true,
							centerY: true,
							css: { position: "absolute", backgroundColor: "transparent", width: "100%", left: 0, top: $(this).offset().top, border: "none", textAlign: "center" },
							overlayCSS: { backgroundColor: '#333333', opacity: 0.7 },
							onBlock: function()
							{
								//console.log("modal activated");
							}
						}); 
						
						$('.blockOverlay').attr('title','Click to cancel');
						$('.blockOverlay').click(
							function(){
							$.unblockUI(
							{
								onUnblock: function()
								{
									//console.log("modal dismissed");
								}
							});
							}
						);
						//$.unblockUI();
				        //setTimeout($.unblockUI, 4000);
						/* setTimeout(function() { 
						            $.unblockUI({ 
						                onUnblock: function(){ ; } 
						            }); 
						        }, 4000);
						*/
					}
				}
			);
			$(div).mousedown( // hack needed to make the clone drag'n'drop work correctly. Damn, it breaks CSS hover !! :(
				function () {
					//$(this).css({'border' : '0.35em outset #FFF8C6'});
				}
			);
			
			var doneOnce = false;
			
			$(div).draggable({ //"#rack .Tile"
				revert: "invalid",
				//cursor: "move",
				opacity: 1,
				helper: "clone",
				//snap: ".Empty",
				start: function(event, ui)
				{
					PlayAudio("audio3");
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var idSelected = IDPrefix_Rack_SquareOrTile + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;
						var divz = document.getElementById(idSelected);
						$(divz).removeClass("Selected");
					}
					html.SetCurrentlySelectedSquareUpdateTargets(0);
					
					$(this).css({ opacity: 0.5 });
					
					$(ui.helper).animate({'font-size' : '120%'}, 300); //height : '+=10px', width : '+=10px', 
						
						$(ui.helper).addClass("dragBorder");
					
				},
				
				drag: function(event, ui)
				{
					if (!doneOnce)
					{
						$(ui.helper).addClass("dragBorder");
						
						doneOnce = true;
					}
					
					//$(ui.helper).css({"color": "#333333 !important"});
				},
				stop: function(event, ui)
				{
					$(this).css({ opacity: 1 });

					PlayAudio('audio5');
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
			div.setAttribute('class', 'Empty');
			
			$(div).click(
				function () {
					var id1 = $(this).attr("id");
					var underscore1 = id1.indexOf("_");
					var cross1 = id1.indexOf("x");
					var x1 = parseInt(id1.substring(underscore1 + 1, cross1), 10);
					var y1 = parseInt(id1.substring(cross1 + 1), 10);

					if (html.CurrentlySelectedSquare != 0)
					{
						var idSelected = IDPrefix_Rack_SquareOrTile + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;
						var divz = document.getElementById(idSelected);

						$(divz).removeClass("Selected");
						
						var XX = html.CurrentlySelectedSquare.X;
						var YY = html.CurrentlySelectedSquare.Y;
						
						html.SetCurrentlySelectedSquareUpdateTargets(0);
						//html.CurrentlySelectedSquare = 0;
						
						rack.MoveTile({'x':XX, 'y':YY}, {'x':x1, 'y':y1});
					}
				}
			);

			$(div).droppable({ //"#rack .Empty"
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
				
					rack.MoveTile({'x':x1, 'y':y1}, {'x':x2, 'y':y2});
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
				default:
					break;
			}
		}
	}

	function DrawHtmlTable_Rack(html, rack)
	{
		var rootDiv = document.getElementById('rack');
		var table = document.createElement('table');
		rootDiv.appendChild(table);
		
		var tr = document.createElement('tr');
		table.appendChild(tr);

		for (var x = 0; x < rack.Dimension; x++)
		{
			var square = rack.SquaresList[x];

			var td = document.createElement('td');
			tr.appendChild(td);

			td.setAttribute('class', 'Normal');
		
			var div = document.createElement('div');
			td.appendChild(div);
			
			var id = IDPrefix_Rack_SquareOrTile + square.X + "x" + square.Y;
			div.setAttribute('id', id);
			
			var a = document.createElement('a');
			div.appendChild(a);
			
			UpdateHtmlTableCell_Rack(html, rack, square);
		}
	}


	function DrawHtmlTable_LetterTiles(html, game)
	{
		var letterDistribution = 0;
		for (var i = 0; i < game.LetterDistributions.length; ++i)
		{
			var ld = game.LetterDistributions[i];
			if (ld.Language == game.Language) // TODO user should select language
			{
				letterDistribution = ld;
			}
		}
		
		var rootDiv = document.getElementById('letters');
		
		if (rootDiv.hasChildNodes())
		{
			while (rootDiv.childNodes.length >= 1)
			{
				rootDiv.removeChild(rootDiv.firstChild);
		    }
		}
		
		var table = document.createElement('table');
		rootDiv.appendChild(table);
		
		var tr = 0

		var counter = 9;
		for (var i = 0; i < letterDistribution.Letters.length; i++)
		{
			var tile = letterDistribution.Letters[i];
			if (tile.IsBlank) continue; //Letter == Tile.prototype.BlankLetter) continue;

			counter++;
			if (counter > 9)
			{
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

			//td.setAttribute('class', td.getAttribute('class') + ' Tile');
			div.setAttribute('class', 'Tile Temp' + (tile.IsBlank ? " BlankLetter" : ""));
			
			$(div).click(
				function () {

					$.unblockUI();
					
					var id1 = $(this).attr("id");
					var underscore1 = id1.indexOf("_");
					var index = parseInt(id1.substring(underscore1 + 1), 10);

					var letterDistribution = 0;
					for (var i = 0; i < game.LetterDistributions.length; ++i)
					{
						var ld = game.LetterDistributions[i];
						if (ld.Language == game.Language) // TODO user should select language
						{
							letterDistribution = ld;
						}
					}
					
					if (game.SquareBlankLetterInWaitingBoard != 0)
					{
						if (html.CurrentlySelectedSquare != game.SquareBlankLetterInWaitingBoard)
						{
							alert("CurrentlySelectedSquare != SquareBlankLetterInWaitingBoard");
						}
						
						game.SquareBlankLetterInWaitingBoard.Tile.Letter = letterDistribution.Letters[index].Letter;

						var square = game.SquareBlankLetterInWaitingBoard;
						game.SquareBlankLetterInWaitingBoard = 0;

						EventsManager.DispatchEvent(Board.prototype.Event_ScrabbleBoardSquareTileChanged, { 'Board': game.Board, 'Square': square });
					}
					
					else if (game.SquareBlankLetterInWaitingRack != 0)
					{
						if (html.CurrentlySelectedSquare != game.SquareBlankLetterInWaitingRack)
						{
							alert("CurrentlySelectedSquare != SquareBlankLetterInWaitingRack");
						}
						
						game.SquareBlankLetterInWaitingRack.Tile.Letter = letterDistribution.Letters[index].Letter;

						var square = game.SquareBlankLetterInWaitingRack;
						game.SquareBlankLetterInWaiting = 0;
					
						EventsManager.DispatchEvent(Rack.prototype.Event_ScrabbleRackSquareTileChanged, { 'Rack': game.Rack, 'Square': square });
					}
					
					
					if (html.CurrentlySelectedSquare != 0)
					{
						var sourceInRack = html.CurrentlySelectedSquare.Y == -1;
						
						var idSelected = (sourceInRack ? IDPrefix_Rack_SquareOrTile : IDPrefix_Board_SquareOrTile) + html.CurrentlySelectedSquare.X + "x" + html.CurrentlySelectedSquare.Y;

						var divz = document.getElementById(idSelected);

						//$(divz).removeClass("Selected");
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
		//input.setAttribute('id', 'cancelBlockUi');
		input.setAttribute('type', 'submit');
		input.setAttribute('value', 'Cancel');
		input.setAttribute('onclick', '$.unblockUI();');
		
		var buttonDiv = document.createElement('div');
		buttonDiv.setAttribute('style', 'background-color: #333333; width: auto; padding: 1em; padding-left: 2em; padding-right: 2em;');
		buttonDiv.appendChild(input);
		rootDiv.appendChild(buttonDiv);
	}
	
	
	_Html.prototype.OnUnblockUIFunction = function(){;};
	
	_Html.prototype.UnblockUIFunction =
		function()
		{
		$.unblockUI(
		{
			onUnblock: function()
			{
				//console.log("modal dismissed");
				_Html.prototype.OnUnblockUIFunction();
				_Html.prototype.OnUnblockUIFunction = function(){;};
			}
		});
		};
	
	_Html.prototype.CleanupErrorLayer = function()
	{
		for (var y = 0; y < this.Board.Dimension; y++)
		{
			for (var x = 0; x < this.Board.Dimension; x++)
			{
				var square = this.Board.SquaresList[x + this.Board.Dimension * y];
				var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
				var td = document.getElementById(id).parentNode;
				$(td).removeClass("Invalid");
				$(td).removeClass("Valid");
				$(td).removeClass("ValidButWrongPlacement");
			}
		}
	}
	
	function handleKeyup(event)
	{
		// NN4 passes the event as a parameter.  For MSIE4 (and others)
		// we need to get the event from the window.
		if (document.all)
		{
			event = window.event;
		}

		var key = event.which;
		if (!key)
		{
			key = event.keyCode;
		}

		if (key == 27) // ESC key
		{
			//document.getElementById('cancelBlockUi').click();
			_Html.prototype.UnblockUIFunction();
			//TODO: move all temp tiles from board back to rack ?
		}

		return true;
	}
	
	function handleKeypress(event)
	{
		// NN4 passes the event as a parameter.  For MSIE4 (and others)
		// we need to get the event from the window.
		if (document.all)
		{
			event = window.event;
		}
		
		if (event.ctrlKey || event.altKey)
		{
			return true;
		}

		var key = event.which;
		if (!key)
		{
			key = event.keyCode;
		}
		
		if(event.charCode == null || event.charCode == 0)
		{
			if (nKeyCode >= 112 && nKeyCode <= 123)
			{
				return true;
			}
		}
		
		if (key > 96)
		{
			key -= 32;
		}

		if (key != 13 && key != 32 && (key < 65 || key > 65 + 26))
		{
			return true;
		}

		if (key == 13) // ENTER/RETURN key
		{
			//TODO submit player turn
		}
		else
		{
			var keyChar = String.fromCharCode(key);
			
			//TODO
		}
		if (document.all)
		{
			event.cancelBubble = true;
			event.returnValue = false;
		}
		else
		{
			event.stopPropagation();
			event.preventDefault();
		}

		return false;
	}
	
	if (document.all)
	{
		//document.attachEvent("onkeypress", handleKeypress);
		document.attachEvent("onkeyup", handleKeyup);
	}
	else
	{
		//document.onkeypress = handleKeypress;
		document.onkeyup = handleKeyup;
	}
	
	var thiz = this;

	var callback_ScrabbleBoardReady = function(eventPayload)
		{
			thiz.Board = eventPayload.Board;
			DrawHtmlTable_Board(thiz, eventPayload.Board);
		};

	EventsManager.AddEventListener(Board.prototype.Event_ScrabbleBoardReady, callback_ScrabbleBoardReady);
	
	var callback_ScrabbleBoardSquareTileChanged = function(eventPayload)
		{
			UpdateHtmlTableCell_Board(thiz, eventPayload.Board, eventPayload.Square);
		};

	EventsManager.AddEventListener(Board.prototype.Event_ScrabbleBoardSquareTileChanged, callback_ScrabbleBoardSquareTileChanged);
	
	var callback_ScrabbleBoardSquareStateChanged = function(eventPayload)
		{
			UpdateHtmlTableCellState(thiz, eventPayload.Board, eventPayload.Square, eventPayload.State);
		};

	EventsManager.AddEventListener(Board.prototype.Event_ScrabbleBoardSquareStateChanged, callback_ScrabbleBoardSquareStateChanged);
	
	var callback_ScrabbleRackReady = function(eventPayload)
		{
			thiz.Rack = eventPayload.Rack;
			DrawHtmlTable_Rack(thiz, eventPayload.Rack);
		};

	EventsManager.AddEventListener(Rack.prototype.Event_ScrabbleRackReady, callback_ScrabbleRackReady);
	
	var callback_ScrabbleRackSquareTileChanged = function(eventPayload)
		{
			UpdateHtmlTableCell_Rack(thiz, eventPayload.Rack, eventPayload.Square);
		};

	EventsManager.AddEventListener(Rack.prototype.Event_ScrabbleRackSquareTileChanged, callback_ScrabbleRackSquareTileChanged);
	
	var callback_ScrabbleLetterTilesReady = function(eventPayload)
		{
			thiz.Game = eventPayload.Game;
			DrawHtmlTable_LetterTiles(thiz, eventPayload.Game);
			
			$('#language').html(thiz.Game.Language.toUpperCase());
		};

	EventsManager.AddEventListener(Game.prototype.Event_ScrabbleLetterTilesReady, callback_ScrabbleLetterTilesReady);
}

_Html.prototype.CurrentlySelectedSquare = 0;
_Html.prototype.Board = 0;
_Html.prototype.Rack = 0;
_Html.prototype.Game = 0;

//TODO: make class method !! (currently some sort of static function)
_Html.prototype.SetCurrentlySelectedSquareUpdateTargets = function(square)
{
	this.CurrentlySelectedSquare = square;
	
	for (var y = 0; y < this.Board.Dimension; y++)
	{
		for (var x = 0; x < this.Board.Dimension; x++)
		{
			var squareTarget = this.Board.SquaresList[x + this.Board.Dimension * y];
			if (squareTarget.Tile == 0)
			{
				var idSelected = IDPrefix_Board_SquareOrTile + squareTarget.X + "x" + squareTarget.Y;
				var divz = document.getElementById(idSelected);
				if (this.CurrentlySelectedSquare == 0)
				{
					$(divz).removeClass("Targeted");
				}
				else
				{
					$(divz).addClass("Targeted");
				}
			}
		}
	}
	
	for (var x = 0; x < this.Rack.Dimension; x++)
	{
		var squareTarget = this.Rack.SquaresList[x];
		if (squareTarget.Tile == 0)
		{
			var idSelected = IDPrefix_Rack_SquareOrTile + squareTarget.X + "x" + squareTarget.Y;
			var divz = document.getElementById(idSelected);
			if (this.CurrentlySelectedSquare == 0)
			{
				$(divz).removeClass("Targeted");
			}
			else
			{
				$(divz).addClass("Targeted");
			}
		}
	}
}

} // END - with (Scrabble.Core)

return _Html;
})();
// END Scrabble.UI.Html ------------------
//=================================================


function randomInt(N)
{
	// % 1 is needed because some implementations of Math.random() can
	// actually return 1 (early version of Opera for example).
	// | 0 does the same as Math.floor() would here, but is probably
	// slightly quicker.
	// For details, see: http://www.merlyn.demon.co.uk/js-randm.htm
	return (N * (Math.random() % 1)) | 0;
}

function getCookie(cookieName) {
	var theCookie = document.cookie;
	if (!theCookie) return 0;
	var cookies = theCookie.split("; ");
	for (var i = 0; i < cookies.length; ++i) {
		var nameVal = cookies[i].split("=");
		if (nameVal[0] == cookieName) return nameVal[1];
	}
	return 0;
}

/*

function getBestPlay() {
	return getCookie("sscrable_bestplay");
}

function setBestPlay(value) {
	document.cookie = "sscrable_bestplay=" + value + ";expires=Tue, 19-Jan-2038 03:14:07 GMT";
}

*/







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

