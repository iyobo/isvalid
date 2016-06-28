/*jshint expr: true*/
'use strict';

var expect = require('chai').expect,
	unique = require('../../lib/tools.js').unique;

var testSyncAndAsync = function(desc, arr, expects) {
	it ('[async] ' + desc, function(done) {
		unique(arr, function(res) {
			expect(res).to.equal(expects);
			done();
		});
	});
	it ('[sync]	' + desc, function() {
		expect(unique(arr)).to.equal(expects);
	});
};

describe('unique', function() {
	testSyncAndAsync (
		'shold return false if array of objects is not unique.',
		[
			{test:{ing:123}},
			{test:{ing:123}}
		],
		false
	);
	testSyncAndAsync (
		'shold return true if array of objects is unique.',
		[
			{test:{ing:123}},
			{test:{ing:456}}
		],
		true
	);
});
