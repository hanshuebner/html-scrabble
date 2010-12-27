/*
SCRABBLE® is a registered trademark. All intellectual property rights in and to the game are owned in the U.S.A and Canada by Hasbro Inc., and throughout the rest of the world by J.W. Spear & Sons Limited of Maidenhead, Berkshire, England, a subsidiary of Mattel Inc. This web page and associated experiments are not associated with any of the owners.
*/

/*
Useful references:

http://en.wikipedia.org/wiki/Scrabble_letter_distributions

http://en.wikipedia.org/wiki/Scrabble
http://fr.wikipedia.org/wiki/Scrabble

*/

/*
Similar HTML/Javascript project:
http://www.themaninblue.com/writing/perspective/2004/01/27/
*/

// BEGIN script-scope ------------------
(function(){

var _OBJECT_ROOT_ = window;


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
// BEGIN Events ------------------
if (typeof _OBJECT_ROOT_.EventsManager == "undefined" || !_OBJECT_ROOT_["EventsManager"])
_OBJECT_ROOT_.EventsManager = (function(){

//Events.AddEventListener('provide', function() {});
//Events.Dispatch('provide', { 'identifier': identifier });

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
		console.log("Event.Dispatch - notifying: " + eventName + ", " + propsString);
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
// END Events ------------------
//=================================================




/*
HTMLScrabble.UI.test = function()
{
	return _sf_startpt; // defined in HTML page
}
*/

})();
// END script-scope ------------------


window.onload = function()
{

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

/*
alert("1: " + HTMLScrabble.UI.test());

with(HTMLScrabble.UI)
{
	alert("2: " + test());
}
*/

}; //END window.onload
