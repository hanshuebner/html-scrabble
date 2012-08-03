var icebox = require('./client/javascript/icebox.js');

exports.testDatePreserved = function(test) {
    var timestamp = new Date();
    var original = { timestamp: timestamp };
    var frozen = icebox.freeze(original);
    var thawed = icebox.thaw(frozen);
    test.equal(timestamp.getTime(), thawed.timestamp.getTime(), 'Date object could not be restored');
    test.done();
}

exports.testDateTwoSameEqual = function(test) {
    var data = { now: new Date() };
    test.deepEqual(icebox.freeze(data), icebox.freeze(data), 'Same object containing Date yielded different external representations');
    test.done();
}