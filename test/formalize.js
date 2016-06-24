'use strict';

var expect = require('chai').expect,
	formalize = require('../lib/formalize.js'),
	SchemaError = require('../lib/errors/schema.js');

var testSyncAndAsync = function(asyncDesc, syncDesc, s, expects) {
	if (typeof expects === 'undefined') {
		expects = s;
		s = syncDesc;
		syncDesc = asyncDesc;
	}
	it ('[async] ' + asyncDesc, function(done) {
		formalize(s, function(err, s) {
			expects(err, s);
			done();
		});
	});
	it ('[sync]	' + syncDesc, function() {
		var err;
		try {
			s = formalize(s);
		} catch (e) {
			err = e;
		}
		expects(err, s);
	});
};

describe('formalizer', function() {
	testSyncAndAsync (
		'should come back with error if array shortcut contains no object.',
		'should throw error if array shortcut contains no object.',
		[],
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Array must have exactly one schema.');
		}
	);
	testSyncAndAsync (
		'should come back with error if schema is garbage value.',
		'should throw error if schema is garbage value.',
		123,
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Cannot validate schema of type 123.');
		}
	);
	testSyncAndAsync (
		'should come back with error if required is not a String or Boolean.',
		'should throw error if required is not a String or Boolean.',
		{ type: String, required: 123 },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'required\' must be of type(s) Boolean, String.');
		}
	);
	testSyncAndAsync (
		'should come back with error if required is a String but not \'implicit\'.',
		'should throw error if required is a String but not \'implicit\'.',
		{ type: String, required: 'test' },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'required\' must be a Boolean or String of value \'implicit\'.');
		}
	);
	testSyncAndAsync (
		'should come back with error if type is String and match is non-RegExp.',
		'should throw error if type is String and match is non-RegExp.',
		{ type: String, match: 123 },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'match\' must be of type(s) RegExp, String.');
		}
	);
	testSyncAndAsync (
		'should come back with error if type is String and enum is not an array.',
		'should throw error if type is String and enum is not an array.',
		{ type: String, enum: 1 },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'enum\' must be of type(s) Array.');
		}
	);
	testSyncAndAsync (
		'should come back with error if type is String and enum has zero valus.',
		'should throw error if type is String and enum has zero valus.',
		{ type: String, enum: [] },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'enum\' must have at least one item.');
		}
	);
	testSyncAndAsync (
		'should come back with error if type is String and enum is not array of strings.',
		'should throw error if type is String and enum is not array of strings.',
		{ type: String, enum: ['this','is',1,'test'] },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'enum\' must be an array of strings.');
		}
	);
	testSyncAndAsync (
		'should come back with error if schema type is unknown.',
		'should throw error if schema type is unknown.',
		{ type: Error },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Cannot validate schema of type Error.');
		}
	);
	testSyncAndAsync (
		'should come back with error if schema is not of supported type.',
		'should throw error if schema is not of supported type.',
		{ type: RegExp },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Cannot validate schema of type RegExp.');
		}
	);
	testSyncAndAsync (
		'should come back with error if unknownKeys is not \'allow\', \'deny\' or \'remove\'.',
		'should throw error if unknownKeys is not \'allow\', \'deny\' or \'remove\'.',
		{ type: Object, unknownKeys: 'test' },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Validator \'unknownKeys\' must have value \'allow\', \'deny\' or \'remove\'.');
		}
	);
	testSyncAndAsync (
		'should come back with error if array schema is unknown type.',
		'should throw error if array schema is unknown type.',
		{ type: Array, schema: RegExp },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Cannot validate schema of type RegExp.');
		}
	);
	testSyncAndAsync (
		'should come back with error if object schema is unknown type.',
		'should throw error if object schema is unknown type.',
		{ type: Object, schema: RegExp },
		function(err, s) {
			expect(err).instanceOf(SchemaError).property('message').equals('Object schemas must be an object.');
		}
	);
	testSyncAndAsync ('should come back with an object shortcut expanded.', {}, function(err, s) {
		expect(s).to.have.property('type');
		expect(s).to.have.property('schema').to.be.an('Object');
	});
	testSyncAndAsync ('should come back with an array shortcut expanded.', [{}], function(err, s) {
		expect(s).to.have.property('type');
		expect(s).to.have.property('schema').to.be.an('Object');
	});
	testSyncAndAsync ('should come back with an Object shortcut expanded.', Object, function(err, s) {
		expect(s).to.have.property('type').equal('Object');
	});
	testSyncAndAsync ('should come back with an Array shortcut expanded.', Array, function(err, s) {
		expect(s).to.have.property('type').equal('Array');
	});
	testSyncAndAsync ('should come back with a String shortcut expanded.', String, function(err, s) {
		expect(s).to.have.property('type').equal('String');
	});
	testSyncAndAsync ('should come back with a Number shortcut expanded.', Number, function(err, s) {
		expect(s).to.have.property('type').equal('Number');
	});
	testSyncAndAsync ('should come back with a Boolean shortcut expanded.', Boolean, function(err, s) {
		expect(s).to.have.property('type').equal('Boolean');
	});
	testSyncAndAsync ('should come back with a Date shortcut expanded.', Date, function(err, s) {
		expect(s).to.have.property('type').equal('Date');
	});
	testSyncAndAsync ('should come back with required set to true if object has not specified required and a nested subschema is required.', {
		'a': { type: String, required: true }
	}, function(err, s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to true if any deep subschema is required.', {
		'a': {
			'b': {
				'c': { type: String, required: true }
			}
		}
	}, function(err, s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to true if root object has required in sub-schema.', {
		'a': { type: String, required: true }
	}, function(err, s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to false if root object required is false and deep subschema is required.', {
		type: Object,
		required: false,
		schema: {
			'a': {
				type: Object,
				required: 'implicit',
				schema: {
					'a': { type: String, required: true }
				}
			}
		}
	}, function(err, s) {
		expect(s).to.have.property('required').to.be.equal(false);
	});
	testSyncAndAsync ('should come back with required set to true if array has deep nested required subschema.', [
		{ type: String, required: true }
	], function(err, s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to false if array is non-required but has deep nested required subschema.', {
		type: Array,
		required: false,
		schema: {
			'a': { type: String, required: true }
		}
	}, function(err, s) {
		expect(s).to.have.property('required').to.be.equal(false);
	});
	testSyncAndAsync ('should come back with an object with both keys formalized.', {
		'a': { type: String, required: true },
		'b': { type: String, required: true }
	}, function(err, s) {
		expect(s).to.have.property('schema');
	});
	testSyncAndAsync ('should come back with no error and match set if match is RegExp.', { type: String, match: /test/ }, function(err, s) {
		expect(s).to.have.property('match');
	});
	testSyncAndAsync ('should come back with custom wrapped in an array.', { custom: function() {} }, function(err, s) {
		expect(s).to.have.property('custom').to.be.an('array');
	});
	testSyncAndAsync ('should come back with custom as an array.', { custom: [ function() {} ] }, function(err, s) {
		expect(s).to.have.property('custom').to.be.an('array');
	});
	var d = new Date();
	testSyncAndAsync ('should come back with error if transforming schema with functions to JSON.', {
		myKey: {
			custom: function() { return true; }
		}
	}, function(err, s) {
		expect(function() {
			JSON.stringify(s);
		}).to.throw(Error, 'Validators with functions cannot be transformed into JSON.');
	});
	testSyncAndAsync ('should come back with JSON string when RegExp is in schema - and make it back to RegExp.', {
		myKey: { type: String, match: /^.*?$/i }
	}, function(err, s) {
		var json = JSON.stringify(s);
		expect(json).to.be.equal('{"type":"Object","schema":{"myKey":{"type":"String","match":"/^.*?$/i"}}}');
		expect(formalize(JSON.parse(json)).schema.myKey.match.toString()).to.equal(/^.*?$/i.toString());
	});
	d.setMilliseconds(0);
	testSyncAndAsync ('should come back with JSON string when Date is in schema - and make it back to Date', {
		myKey: { type: Date, default: d }
	}, function(err, s) {
		var json = JSON.stringify(s);
		expect(json).to.be.equal('{"type":"Object","schema":{"myKey":{"type":"Date","default":"' + d.toString() + '"}}}');
		expect(formalize(JSON.parse(json)).schema.myKey.default.getTime()).to.equal(d.getTime());
	});
});
