var fs = require('fs');
var util = require('util');
var icebox = require('./icebox.js');
var EventEmitter = require('events').EventEmitter;

const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const keysAsync = promisify(client.keys).bind(client);

// //////////////////////////////////////////////////////////////////////

function DB() {
    this.prototypeMap = {};
    EventEmitter.call(this);
    console.log('opening database');
    var db = this;
    db.on('all', function () { db.emit('load', 0); });
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

DB.prototype.snapshot = function() {
  console.log("Called redis stub snapshot function")
}

exports.DB = DB;
