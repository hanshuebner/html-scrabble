
function thaw(object, prototypeMap) {
    var objectsThawed = [];

    function thawTree(object) {
        if (object && (typeof object == 'object')) {
            if (object._ref) {
                if (objectsThawed[object._ref]) {
                    return objectsThawed[object._ref];
                } else {
                    throw "invalid reference to id " + _object._ref;
                }
            } else {
                var thawed = (typeof object.length == 'undefined') ? {} : [];
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
            if (object._frozen) {
                return { _ref: object._frozen._id };
            } else {
                var frozen = freezeObject(object);
                if (!object.constructor.name.match(/^(Date|Array|Object)$/)) {
                    frozen._constructorName = object.constructor.name;
                }
                for (var prop in object) {
                    if (object.hasOwnProperty(prop) && prop != '_constructorName') {
                        frozen[prop] = freezeTree(object[prop]);
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