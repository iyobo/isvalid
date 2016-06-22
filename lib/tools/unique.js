'use strict';

var equals = require('./equals.js');

var allowIO = setImmediate || (process || {}).nextTick || setTimeout;

module.exports = exports = function(arr, fn, sync) {

	if (!fn) {
		fn = function(ret) { return ret; };
		sync = true;
	}

	if (arr.length <= 1) return fn(true);

	return (function testNext(idx1, idx2) {
		if (idx2 == arr.length) {
			idx1++;
			idx2 = idx1 + 1;
		}
		if (idx2 == arr.length) return fn(true);
		return equals(arr[idx1], arr[idx2], function(res) {
			if (res) return fn(false);
			if (sync) return testNext(idx1, idx2 + 1);
			allowIO(testNext, idx1, idx2 + 1);
		}, sync);
	})(0, 1);

};
