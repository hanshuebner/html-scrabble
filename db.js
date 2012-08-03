var fs = require('fs');
var dirty = require('dirty');
var util = require('util');
var icebox = require('./client/javascript/icebox.js');
var EventEmitter = require('events').EventEmitter;

// //////////////////////////////////////////////////////////////////////

function DB(path) {
    this.prototypeMap = {};
    EventEmitter.call(this);
    console.log('opening database', path);
    this.dirty = dirty(path);
    var db = this;
    this.dirty.on('load', function () { db.emit('load', 0); });
}

util.inherits(DB, EventEmitter);

DB.prototype.registerObject = function(constructor) {
    this.prototypeMap[constructor.name] = constructor;
}

DB.prototype.get = function(key) {
    return icebox.thaw(this.dirty.get(key), this.prototypeMap);
}

DB.prototype.set = function(key, object) {
    this.dirty.set(key, icebox.freeze(object));
}

DB.prototype.all = function() {
    var retval = [];
    this.dirty.forEach(function(key, value) {
        retval.push(value);
    });
    return retval;
}

DB.prototype.snapshot = function(filename) {
    var db = this;
    if (fs.existsSync(filename)) {
        throw 'snapshot cannot overwrite existing file ' + filename;
    }
    var snapshot = dirty(filename);
    snapshot.on('load', function() {
        db.dirty.forEach(function(key, value) {
            snapshot.set(key, value);
        });
    });
}

exports.DB = DB;
