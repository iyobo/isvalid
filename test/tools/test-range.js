'use strict';

var expect = require('chai').expect,
	should = require('chai').should(),
	testRange = require('../../lib/tools/test-range.js');

describe('ranges', function() {
	it ('should throw an error if ranges is not a string.', function() {
		expect(function() {
			testRange([123], 1);
		}).to.throw(Error);
	});
	it ('should throw no error if ranges is a number.', function() {
		expect(function() {
			testRange(1, 1);
		}).not.to.throw(Error);
	});
	it ('should throw error if ranges is string but format is invalid.', function() {
		expect(function() {
			testRange('abc', 1);
		}).to.throw(Error);
	});
	it ('should throw error if index is not set.', function() {
		expect(function() {
			testRange(1);
		});
	});
	it ('should return true if index is within range.', function() {
		expect(testRange('-2,4-6,8,10-', 2)).to.equal(true);
	});
	it ('should return false if index is not within range.', function() {
		expect(testRange('-2,4-6,8,10-', 3)).to.equal(false);
	});
});
