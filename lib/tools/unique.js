'use strict';

var equals = require('./equals.js'),
	allowIO = require('./allow-io.js'),
	sync = require('./sync.js');

module.exports = exports = function(arr, fn) {

	fn = fn || sync(true, function(ret) {
		return ret;
	});

	if (arr.length <= 1) return fn(true);

	return (function testNext(idx1, idx2) {
		if (idx2 == arr.length) {
			idx1++;
			idx2 = idx1 + 1;
		}
		if (idx2 == arr.length) return fn(true);
		return equals(arr[idx1], arr[idx2], sync(fn.sync, function(res) {
			if (res) return fn(false);
			if (sync) return testNext(idx1, idx2 + 1);
			allowIO(testNext, idx1, idx2 + 1);
		}));
	})(0, 1);

};
