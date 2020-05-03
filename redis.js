var fs = require('fs');
var dirty = require('dirty');
var util = require('util');
var icebox = require('./icebox.js');
var EventEmitter = require('events').EventEmitter;

const redis = require('redis');
const client = redis.createClient(); // TODO: use REDIS_URL here
const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const keysAsync = promisify(client.keys).bind(client);

// //////////////////////////////////////////////////////////////////////

function DB(path) {
    this.prototypeMap = {};
    EventEmitter.call(this);
    console.log('opening database', path);
    this.path = path;
    this.dirty = dirty(path);
    var db = this;
    this.dirty.on('load', function () { db.emit('load', 0); });
    this.dirty.on('all', function () { db.emit('load', 0); });
}

util.inherits(DB, EventEmitter);

DB.prototype.registerObject = function(constructor) {
    this.prototypeMap[constructor.name] = constructor;
}

DB.prototype.get = async function(key) {
    const json = await getAsync(key);
    const data = JSON.parse(json);
    const game = icebox.thaw(data, this.prototypeMap);
    return game;
}

DB.prototype.set = function(key, object) {
    data = icebox.freeze(object);
    this.dirty.set(key, data);
    client.set(key, JSON.stringify(data));
}

DB.prototype.all = async function() {
    const keys = await keysAsync('*');
    var retval = [];
    for (let i = 0; i < keys.length; i++) {
        const jsn = await getAsync(keys[i]);
        const value = JSON.parse(jsn);
        retval.push(value);
    }
    return retval;
}

exports.DB = DB;
