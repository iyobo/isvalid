'use strict';

var expect = require('chai').expect,
	formalize = require('../lib/schema.js').formalize,
	SchemaError = require('../lib/errors/schema.js');

var testSyncAndAsync = function(desc, s, expects) {
	it ('[async] ' + desc, function(done) {
		formalize(s, function(s) {
			expects(s);
			done();
		});
	});
	it ('[sync]	' + desc, function() {
		s = formalize(s);
		expects(s);
	});
};

describe('formalizer', function() {
	it ('should throw an error if array shortcut contains no object.', function() {
		expect(function() {
			formalize([]);
		}).to.throw(SchemaError, 'Array must have exactly one schema.');
	});
	it ('should throw an error if schema is garbage value.', function() {
		expect(function() {
			formalize(123);
		}).to.throw(SchemaError, 'Cannot validate schema of type 123.');
	});
	it ('should throw error if required is not a String or Boolean.', function() {
		expect(function() {
			formalize({ type: String, required: 123 });
		}).to.throw(SchemaError, 'Validator \'required\' must be of type(s) Boolean, String.');
	});
	it ('should throw error if required is a String but not \'implicit\'.', function() {
		expect(function() {
			formalize({ type: String, required: 'test' });
		}).to.throw(SchemaError, 'Validator \'required\' must be a Boolean or String of value \'implicit\'.');
	});
	it ('should throw error if type is String and match is non-RegExp.', function() {
		expect(function() {
			formalize({ type: String, match: 'test' });
		}).to.throw(SchemaError, 'Validator \'match\' must be of type(s) RegExp.');
	});
	it ('should throw error if type is String and enum is not an array.', function() {
		expect(function() {
			formalize({ type: String, enum: 1 });
		}).to.throw(SchemaError, 'Validator \'enum\' must be of type(s) Array.');
	});
	it ('should throw error if type is String and enum has zero valus.', function() {
		expect(function() {
			formalize({ type: String, enum: [] });
		}).to.throw(SchemaError, 'Validator \'enum\' must have at least one item.');
	});
	it ('should throw error if type is String and enum is not array of strings.', function() {
		expect(function() {
			formalize({ type: String, enum: ['this','is',1,'test'] });
		}).to.throw(SchemaError, 'Validator \'enum\' must be an array of strings.');
	});
	it ('should throw an error if schema type is unknown.', function() {
		expect(function() {
			formalize({ type: Error });
		}).to.throw(SchemaError, 'Cannot validate schema of type Error.');
	});
	it ('should throw an error if schema is not of supported type.', function() {
		expect(function() {
			formalize({ type: RegExp });
		}).to.throw(SchemaError, 'Cannot validate schema of type RegExp.');
	});
	it ('should throw an error if unknownKeys is not \'allow\', \'deny\' or \'remove\'.', function() {
		expect(function() {
			formalize({ type: Object, unknownKeys: 'test' });
		}).to.throw(SchemaError, 'Validator \'unknownKeys\' must have value \'allow\', \'deny\' or \'remove\'.');
	});
	it ('should throw an error if array schema is unknown type.', function() {
		expect(function() {
			formalize({ type: Array, schema: RegExp });
		}).to.throw(SchemaError, 'Cannot validate schema of type RegExp.');
	});
	it ('should throw an error if object schema is unknown type.', function() {
		expect(function() {
			formalize({ type: Object, schema: RegExp });
		}).to.throw(SchemaError, 'Object schemas must be an object.');
	});
	testSyncAndAsync ('should come back with an object shortcut expanded.', {}, function(s) {
		expect(s).to.have.property('type');
		expect(s).to.have.property('schema').to.be.an('Object');
	});
	testSyncAndAsync ('should come back with an array shortcut expanded.', [{}], function(s) {
		expect(s).to.have.property('type');
		expect(s).to.have.property('schema').to.be.an('Object');
	});
	testSyncAndAsync ('should come back with an Object shortcut expanded.', Object, function(s) {
		expect(s).to.have.property('type').equal('Object');
	});
	testSyncAndAsync ('should come back with an Array shortcut expanded.', Array, function(s) {
		expect(s).to.have.property('type').equal('Array');
	});
	testSyncAndAsync ('should come back with a String shortcut expanded.', String, function(s) {
		expect(s).to.have.property('type').equal('String');
	});
	testSyncAndAsync ('should come back with a Number shortcut expanded.', Number, function(s) {
		expect(s).to.have.property('type').equal('Number');
	});
	testSyncAndAsync ('should come back with a Boolean shortcut expanded.', Boolean, function(s) {
		expect(s).to.have.property('type').equal('Boolean');
	});
	testSyncAndAsync ('should come back with a Date shortcut expanded.', Date, function(s) {
		expect(s).to.have.property('type').equal('Date');
	});
	testSyncAndAsync ('should come back with required set to true if object has not specified required and a nested subschema is required.', {
		'a': { type: String, required: true }
	}, function(s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to true if any deep subschema is required.', {
		'a': {
			'b': {
				'c': { type: String, required: true }
			}
		}
	}, function(s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to true if root object has required in sub-schema.', {
		'a': { type: String, required: true }
	}, function(s) {
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
	}, function(s) {
		expect(s).to.have.property('required').to.be.equal(false);
	});
	testSyncAndAsync ('should come back with required set to true if array has deep nested required subschema.', [
		{ type: String, required: true }
	], function(s) {
		expect(s).to.have.property('required').to.be.equal(true);
	});
	testSyncAndAsync ('should come back with required set to false if array is non-required but has deep nested required subschema.', {
		type: Array,
		required: false,
		schema: {
			'a': { type: String, required: true }
		}
	}, function(s) {
		expect(s).to.have.property('required').to.be.equal(false);
	});
	testSyncAndAsync ('should come back with an object with both keys formalized.', {
		'a': { type: String, required: true },
		'b': { type: String, required: true }
	}, function(s) {
		expect(s).to.have.property('schema');
	});
	testSyncAndAsync ('should come back with no error and match set if match is RegExp.', { type: String, match: /test/ }, function(s) {
		expect(s).to.have.property('match');
	});
	testSyncAndAsync ('should come back with custom wrapped in an array.', { custom: function() {} }, function(s) {
		expect(s).to.have.property('custom').to.be.an('array');
	});
	testSyncAndAsync ('should come back with custom as an array.', { custom: [ function() {} ] }, function(s) {
		expect(s).to.have.property('custom').to.be.an('array');
	});
	var d = new Date();
	testSyncAndAsync ('should come back with non-JSON types as strings.', {
		myFirstKey: {
			type: String,
			match: /^[0-9]+$/,
		},
		mySecondKey: {
			type: Date,
			default: d
		},
		meThirdKey: {
			custom: function() { return true; }
		}
	}, function(s) {
		expect(JSON.stringify(s)).to.be.equal('{"type":"Object","schema":{"myFirstKey":{"type":"String","match":"/^[0-9]+$/"},"mySecondKey":{"type":"Date","default":"' + d.toString() + '"},"meThirdKey":{"custom":["function () { return true; }"]}}}');
	});
});
