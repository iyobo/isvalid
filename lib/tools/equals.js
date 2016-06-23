'use strict';

var allowIO = require('./allow-io.js'),
	sync = require('./sync.js');

function objectEquals(obj1, obj2, fn) {

	var keys = Object.keys(obj1);

	return arrayEquals(Object.keys(obj1), Object.keys(obj2), sync(fn.sync, function(res) {

		if (!res) return fn(false);

		return (function testNext(idx) {
			if (idx == keys.length) return fn(true);
			var key = keys[idx];
			return equals(obj1[key], obj2[key], sync(fn.sync, function(res) {
				if (!res) return fn(false);
				if (fn.sync) return testNext(idx + 1);
				allowIO(testNext, idx + 1);
			}));
		})(0);

	}));

}

function arrayEquals(obj1, obj2, fn) {

	if (obj1.length != obj2.length) return fn(false);

	var o1 = obj1.sort();
	var o2 = obj2.sort();

	return (function testNext(idx) {
		if (idx == o1.length) return fn(true);
		return equals(o1[idx], o2[idx], sync(fn.sync, function(res) {
			if (!res) return fn(false);
			if (fn.sync) return testNext(idx + 1);
			allowIO(testNext, idx + 1);
		}));
	})(0);

}

function equals(obj1, obj2, fn) {

	fn = fn || sync(true, function(ret) {
		return ret;
	});

	if ((obj1 && !obj2) || (!obj1 && obj2)) return fn(false);
	if (typeof obj1 !== typeof obj2) return fn(false);

	if (typeof obj1 === 'object') {
		if (obj1.constructor.name === 'Object') return objectEquals(obj1, obj2, fn);
		if (obj1.constructor.name === 'Array') return arrayEquals(obj1, obj2, fn);
	}

	return fn(obj1 == obj2);

}

module.exports = exports = equals;
