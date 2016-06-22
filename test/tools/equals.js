/*jshint expr: true*/
'use strict';

var expect = require('chai').expect,
	equals = require('../../lib/tools/equals.js');

var testSyncAndAsync = function(desc, s1, s2, expects) {
	it ('[async] ' + desc, function(done) {
		equals(s1, s2, function(res) {
			expect(res).to.equal(expects);
			done();
		});
	});
	it ('[sync]	' + desc, function() {
		expect(equals(s1, s2)).to.equal(expects);
	});
};

describe('equals', function() {
	testSyncAndAsync ('should return false if data is not of the same type (null).', 1, null, false);
	testSyncAndAsync ('should return false if data is not of the same type.', 1, '1', false);
	testSyncAndAsync ('should return true if strings are equal.', 'This is a string', 'This is a string', true);
	testSyncAndAsync ('should return false if string are equal', 'This is a string', 'This is another string', false);
	testSyncAndAsync ('should return true if numbers are equal.', 1, 1, true);
	testSyncAndAsync ('should return false if numbers are not equal.', 1, 2, false);
	testSyncAndAsync ('should return true if booleans are equal.', false, false, true);
	testSyncAndAsync ('should return false if booleans are not equal.', true, false, false);
	var d = new Date();
	testSyncAndAsync ('should return true if dates are equal.', d, d, true);
	var d1 = new Date();
	var d2 = new Date();
	d2.setYear(d2.getFullYear() + 1);
	testSyncAndAsync ('should return false if dates are not equal.', d1, d2, false);
	testSyncAndAsync ('should return true if objects are equal.', { awesome: true }, { awesome: true }, true);
	testSyncAndAsync ('should return false if object are not equal.', { awesome: true }, { awesome: false }, false);
	testSyncAndAsync ('should return true if arrays are equal.', ['This','is','an','array'], ['This','is','an','array'], true);
	testSyncAndAsync ('should return false if arrays are not equal.', ['This','is','an','array'], ['This','is','another','array'], false);
	testSyncAndAsync ('should return true if objects with arrays are equal.', {
		obj: ['This','is','an','array']
	}, {
		obj: ['This','is','an','array']
	}, true);
	testSyncAndAsync ('should return false if objects with arrays are not equal.', {
		obj: ['This','is','an','array']
	}, {
		obj: ['This','is','another','array']
	}, false);
});
