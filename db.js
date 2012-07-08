var cycle = require('cycle');
var dirty = require('dirty');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

// //////////////////////////////////////////////////////////////////////

function DB(path) {
    this.prototypeMap = {};
    EventEmitter.call(this);
    this.db = dirty(path);
    var db = this;
    this.db.on('load', function () { db.emit('load', 0); });
}

util.inherits(DB, EventEmitter);

DB.prototype.cloneTree = function(object, f) {
    var objectsSeen = [];

    function cloneObject(object) {
        object._clone = (typeof object.length == 'undefined') ? {} : [];
        Object.defineProperty(object, '_clone', { enumerable: false });
        objectsSeen.push(object);
        return object._clone;
    }

    function cloneTree_(object) {
        if (object && (typeof object == 'object')) {
            if (object._clone) {
                return object._clone;
            } else {
                var clone = cloneObject(object, clone);
                f(object, clone);
                for (var prop in object) {
                    if (object.hasOwnProperty(prop) && prop != '_constructorName') {
                        clone[prop] = cloneTree_(object[prop]);
                    }
                }
                return clone;
            }
        } else {
            return object;
        }
    }
    var after = cloneTree_(object);
    for (var i in objectsSeen) {
        delete objectsSeen[i]._clone;
    }
    return after;
}

DB.prototype.restorePrototypes = function(object) {

    var db = this;
    return this.cloneTree(object, function(object, clone) {
        if (object._constructorName) {
            var constructor = db.prototypeMap[object._constructorName];
            if (constructor) {
                clone.__proto__ = constructor['prototype'];
            } else {
                console.log('no prototype for ' + object._constructorName);
            }
        }
    });
}

DB.prototype.savePrototypes = function(object) {

    return this.cloneTree(object, function(object, clone) {
        if (!object.constructor.name.match(/^(Date|Array|Object)$/)) {
            clone._constructorName = object.constructor.name;
        }
    });
}

DB.prototype.registerObject = function(constructor) {
    this.prototypeMap[constructor.name] = constructor;
}

DB.prototype.get = function(key) {
    var object = this.db.get(key);
    object = this.restorePrototypes(object);
    object = cycle.retrocycle(object);
    return object;
}

DB.prototype.set = function(key, object) {
    object = this.savePrototypes(object);
    object = cycle.decycle(object);
    this.db.set(key, object);
}

exports.DB = DB;
