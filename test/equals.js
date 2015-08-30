var expect = require('chai').expect,
	equals = require('../lib/equals.js');

// Tests both sync and async calls.
var testSyncAndAsync = function(desc, d1, d2, expects) {
	it  ('[async] ' + desc, function(done) {
		equals(d1, d2, function(res) {
			expects(res);
			done();
		});
	});
	it  ('[sync]  ' + desc, function() {
		expects(equals(d1, d2));
	});
};

// Used by date testing.
var date1 = new Date();
var date2 = new Date();
date2.setYear(date2.getFullYear() + 1);

describe('equals', function() {
	testSyncAndAsync ('should return false if data is not of the same type (null).', 1, null, function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return false if data is not of the same type.', 1, '1', function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if strings are equal.', 'This is a string', 'This is a string', function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if string are equal', 'This is a string', 'This is another string', function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if numbers are equal.', 1, 1, function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if numbers are not equal.', 1, 2, function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if booleans are equal.', false, false, function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if booleans are not equal.', true, false, function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if dates are equal.', date1, date1, function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if dates are not equal.', date1, date2, function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if objects are equal.', { awesome: true }, { awesome: true }, function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if object are not equal.', { awesome: true }, { awesome: false }, function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if arrays are equal.', ['This','is','an','array'], ['This','is','an','array'], function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if arrays are not equal.', ['This','is','an','array'], ['This','is','another','array'], function(res) {
		expect(res).to.be.false;
	});
	testSyncAndAsync ('should return true if objects with arrays are equal.', { obj: ['This','is','an','array'] }, { obj: ['This','is','an','array'] }, function(res) {
		expect(res).to.be.true;
	});
	testSyncAndAsync ('should return false if objects with arrays are not equal.', { obj: ['This','is','an','array'] }, { obj: ['This','is','another','array'] }, function(res) {
		expect(res).to.be.false;
	});
});
