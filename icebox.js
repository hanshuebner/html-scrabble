
function thaw(object, prototypeMap) {
    var objectsThawed = [];

    if (prototypeMap && prototypeMap.length) {
        // convert to hash map
        var newPrototypeMap = {};
        prototypeMap.forEach(function(constructor) { newPrototypeMap[constructor.name] = constructor; });
        prototypeMap = newPrototypeMap
    }

    function thawTree(object) {
        if (object && (typeof object == 'object')) {
            if (object._ref !== undefined) {
                if (objectsThawed[object._ref]) {
                    return objectsThawed[object._ref];
                } else {
                    throw "invalid reference to id " + _object._ref;
                }
            } else {
                var thawed;
                if (object._constructorName == 'Date') {
                    thawed = new Date(object._isoString);
                } else {
                    thawed = (typeof object.length == 'undefined') ? {} : [];
                    if (object.hasOwnProperty('_constructorName')) {
                        var constructor = prototypeMap[object._constructorName];
                        if (constructor) {
                            thawed.__proto__ = constructor['prototype'];
                        } else {
                            console.log('no prototype for ' + object._constructorName);
                        }
                    }
                    if (object.hasOwnProperty('_id')) {
                        objectsThawed[object._id] = thawed;
                    }
                    for (var prop in object) {
                        if (object.hasOwnProperty(prop)
                            && prop != '_constructorName'
                            && prop != '_id') {
                            thawed[prop] = thawTree(object[prop]);
                        }
                    }
                }
                return thawed;
            }
        } else {
            return object;
        }
    }

    return thawTree(object);
}

function freeze(object) {
    var objectsFrozen = [];
    var id = 0;

    function freezeObject(object) {
        object._frozen = (typeof object.length == 'undefined') ? {} : [];
        Object.defineProperty(object, '_frozen', { enumerable: false });
        objectsFrozen[id] = object;
        object._frozen._id = id;
        id++;
        return object._frozen;
    }

    function freezeTree(object) {
        if (object && (typeof object == 'object')) {
	    if (!object.constructor) {
		console.log('freeze strange object', object);
		return object;
	    } else if (object._frozen) {
                return { _ref: object._frozen._id };
            } else {
                var frozen = freezeObject(object);
                if (!object.constructor.name.match(/^(Array|Object)$/)) {
                    frozen._constructorName = object.constructor.name;
                }
                if (object.constructor.name == 'Date') {
                    frozen._isoString = object.toISOString();
                } else {
                    for (var prop in object) {
                        if (object.hasOwnProperty(prop) && prop != '_constructorName') {
                            frozen[prop] = freezeTree(object[prop]);
                        }
                    }
                }
                return frozen;
            }
        } else {
            return object;
        }
    }
    var after = freezeTree(object);
    for (var i in objectsFrozen) {
        delete objectsFrozen[i]._frozen;
    }
    return after;
}

if (typeof exports == 'object') {
    exports.freeze = freeze;
    exports.thaw = thaw;
}
