'use strict';

var allowIO = setImmediate || (process || {}).nextTick || setTimeout;

var objectEquals = function(obj1, obj2, fn, sync) {

	var keys = Object.keys(obj1);

	return arrayEquals(Object.keys(obj1), Object.keys(obj2), function(res) {

		if (!res) return fn(false);

		return (function testNext(idx) {
			if (idx == keys.length) return fn(true);
			var key = keys[idx];
			return equals(obj1[key], obj2[key], function(res) {
				if (!res) return fn(false);
				if (sync) return testNext(idx + 1);
				allowIO(testNext, idx + 1);
			}, sync);
		})(0);

	}, sync);

};

var arrayEquals = function(obj1, obj2, fn, sync) {

	if (obj1.length != obj2.length) return fn(false);

	var o1 = obj1.sort();
	var o2 = obj2.sort();

	return (function testNext(idx) {
		if (idx == o1.length) return fn(true);
		return equals(o1[idx], o2[idx], function(res) {
			if (!res) return fn(false);
			if (sync) return testNext(idx + 1);
			allowIO(testNext, idx + 1);
		}, sync);
	})(0);

};

var equals = function(obj1, obj2, fn, sync) {

	if (typeof fn === 'undefined') {
		fn = function(ret) { return ret; };
		sync = true;
	}

	if ((obj1 && !obj2) || (!obj1 && obj2)) return fn(false);
	if (typeof obj1 !== typeof obj2) return fn(false);

	if (typeof obj1 === 'object') {
		if (obj1.constructor.name === 'Object') return objectEquals(obj1, obj2, fn, sync);
		if (obj1.constructor.name === 'Array') return arrayEquals(obj1, obj2, fn, sync);
	}

	return fn(obj1 == obj2);

};

module.exports = exports = equals;
