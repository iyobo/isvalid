'use strict';

// Helper function for allowing IO when running function async.
function allowIO(fnc) {
	var hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
	var hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

	var args = Array.apply(null, arguments).slice(1);
	// We use whatever async functionality available on the client.
	// setImmediate: node >= 0.10, IE => 10
	// process.nextTick: node <= 0.8
	// setTimeout: all others
	var method = setTimeout;
	if (hasNextTick) method = process.nextTick;
	if (hasSetImmediate) method = setImmediate;

	method(function() {
		fnc.apply(null, args);
	});
}

// Creates a synchronous callback function.
function sync(sync, fnc) {
	// Mark the func sync/async.
	fnc.sync = sync;
	return fnc;
}

// Tests if two objects are equal
function objectEquals(obj1, obj2, fn) {

	var keys = Object.keys(obj1);

	return arrayEquals(Object.keys(obj1), Object.keys(obj2), sync(fn.sync, function(res) {

		if (!res) return fn(false);

		return (function testNext(idx) {
			if (idx === keys.length) return fn(true);
			var key = keys[idx];
			return equals(obj1[key], obj2[key], sync(fn.sync, function(res) {
				if (!res) return fn(false);
				if (fn.sync) return testNext(idx + 1);
				allowIO(testNext, idx + 1);
			}));
		})(0);

	}));

}

// Test if two arrays are equal.
function arrayEquals(arr1, arr2, fn) {

	if (arr1.length !== arr2.length) return fn(false);

	var a1 = arr1.sort();
	var a2 = arr2.sort();

	return (function testNext(idx) {
		if (idx === a1.length) return fn(true);
		return equals(a1[idx], a2[idx], sync(fn.sync, function(res) {
			if (!res) return fn(false);
			if (fn.sync) return testNext(idx + 1);
			allowIO(testNext, idx + 1);
		}));
	})(0);

}

// Test if two values are equal.
function equals(val1, val2, fn) {

	fn = fn || sync(true, function(ret) {
		return ret;
	});

	if ((val1 && !val2) || (!val1 && val2)) return fn(false);
	if (typeof val1 !== typeof val2) return fn(false);

	if (typeof val1 === 'object') {
		if (val1.constructor.name === 'Object') return objectEquals(val1, val2, fn);
		if (val2.constructor.name === 'Array') return arrayEquals(val1, val2, fn);
	}

	return fn(val1 === val2);

}

// Test if an array is a set.
function unique(arr, fn) {

	fn = fn || sync(true, function(ret) {
		return ret;
	});

	if (arr.length <= 1) return fn(true);

	return (function testNext(idx1, idx2) {
		if (idx2 === arr.length) {
			idx1++;
			idx2 = idx1 + 1;
		}
		if (idx2 === arr.length) return fn(true);
		return equals(arr[idx1], arr[idx2], sync(fn.sync, function(res) {
			if (res) return fn(false);
			if (sync) return testNext(idx1, idx2 + 1);
			allowIO(testNext, idx1, idx2 + 1);
		}));
	})(0, 1);

}

// Test if index is within range.
function testRange(ranges, index) {

	// Convert to string if ranges is a Number.
	if (ranges !== undefined && typeof ranges === 'number') {
		ranges = ranges.toString();
	}

	// Throw if ranges is not a string.
	if (!ranges || typeof ranges !== 'string') {
		throw new Error('Ranges must be a number or a string expressed as: ex. \'-2,4-6,8,10-\'.');
	}

	// Throw if index is not a number.
	if (index === undefined || typeof index !== 'number') {
		throw new Error('Index is not a number.');
	}

	// Split into individual ranges.
	var r = ranges.split(',');
	for (var idx in r) {

		// Get the boundaries of the range.
		var boundaries = r[idx].split('-');

		// Low and high boundaries are the same where only one number is specified.
		if (boundaries.length === 1) boundaries = [ boundaries[0], boundaries[0] ];
		// Throw an error if there is not exactly to boundaries.
		if (boundaries.length !== 2) throw new Error('Malformed range \'' + r[idx] + '\'.');

		// Test for malformed boundaries
		for (var bidx = 0 ; bidx < 2 ; bidx++) {
			if (!/^[0-9]*$/.test(boundaries[bidx])) throw new Error('Malformed boundary \'' + boundaries[bidx] + '\'.');
		}

		var lowBoundary = boundaries[0];
		var highBoundary = boundaries[1];

		// If no lower boundary is specified we use -Infinity
		if (lowBoundary.length === 0) lowBoundary = -Infinity;
		else lowBoundary = parseInt(lowBoundary);

		// If no higher boundary is specified we use Infinity;
		if (highBoundary.length === 0) highBoundary = Infinity;
		else highBoundary = parseInt(highBoundary);

		// If index is within boundaries return true;
		if (index >= lowBoundary && index <= highBoundary) return true;

	}

	// Index was not matched to any range.
	return false;

}

module.exports = exports = {
	allowIO: allowIO,
	sync: sync,
	equals: equals,
	unique: unique,
	testRange: testRange
};
