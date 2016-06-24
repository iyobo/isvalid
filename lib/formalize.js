'use strict';

var merge = require('merge'),
    SchemaError = require('./errors/schema.js'),
		allowIO = require('./tools/allow-io.js'),
		sync = require('./tools/sync.js');

function rejectToJSON() {
	throw new Error('Validators with functions cannot be transformed into JSON.');
}

function finalize(formalizedSchema, nonFormalizedSchema, fn) {

	// Add the old non-formalized schema - for preventing
	// redundant formalization and for usage by the
	// validator when sending validation errors.
	//
	// Make the property unenumerable.
	Object.defineProperty(formalizedSchema, '_nonFormalizedSchema', {
		value: nonFormalizedSchema,
		enumerable: false,
	});

	// We seal the schema so no futher editing can take place.
	Object.seal(formalizedSchema);

	// Allow for I/O if running async.
	if (fn.sync) return fn(null, formalizedSchema);
	else allowIO(fn, null, formalizedSchema);

}

function formalizeObject(formalizedSchema, nonFormalizedSchema, fn) {

	// If no sub-schema is provided we consider the schema final.
	if (typeof formalizedSchema.schema === 'undefined') return finalize(formalizedSchema, nonFormalizedSchema, fn);
	if (formalizedSchema.schema.constructor.name !== 'Object') return fn(new SchemaError(formalizedSchema.schema, 'Object schemas must be an object.'));

	// Build new formalized schema into this.
	var formalizedSubschema = {};

	var keys = Object.keys(formalizedSchema.schema);

	(function formalizeNextKey(idx) {

		// If idx equals keys length - we are done.
		if (idx == keys.length) {
			formalizedSchema.schema = formalizedSubschema;
			formalizedSchema = finalize(formalizedSchema, nonFormalizedSchema, fn);
			return;
		}

		var key = keys[idx];

		formalizeAny(formalizedSchema.schema[key], sync(fn.sync, function(err, formalizedKey) {

			if (err) return fn(err);

			// Apply implicit required if sub-schema is required.
			if (formalizedSchema.required === undefined || formalizedSchema.required === 'implicit') {
				if (formalizedKey.required === true) formalizedSchema.required = true;
			}

			formalizedSubschema[key] = formalizedKey;

			if (fn.sync) return formalizeNextKey(idx + 1);
			else allowIO(formalizeNextKey, idx + 1);

		}, fn.sync));

	})(0);

	return formalizedSchema;

}

function formalizeArray(formalizedSchema, nonFormalizedSchema, fn) {

	// formalizedSchema has been pre-processed by formalizeAny, so
	// we only need to formalize the sub-schema.

	// If no sub-schema is provided we consider the schema final.
	if (typeof formalizedSchema.schema === 'undefined') return finalize(formalizedSchema, nonFormalizedSchema, fn);

	return formalizeAny(formalizedSchema.schema, sync(fn.sync, function(err, formalizedSubschema) {

		if (err) return fn(err);

		formalizedSchema.schema = formalizedSubschema;

		// Apply implicit required if sub-schema has required data.
		if (typeof(formalizedSchema.required) === 'undefined' || formalizedSchema.required === 'implicit') {
			if (formalizedSchema.schema.required === true) formalizedSchema.required = true;
		}

		return finalize(formalizedSchema, nonFormalizedSchema, fn);

	}));

}

function formalizeAny(schema, fn) {

	// If no fn we operate sync.
	fn = fn || sync(true, function(err, s) {
		if (err) throw err;
		return s;
	});

	if (!schema) {
		return fn(new SchemaError(schema, 'No schema provided'));
	}

	// If schema is already formalized we just call back.
	if (schema._nonFormalizedSchema !== undefined) return fn(null, schema);

	// Take care of object shortcuts
	if (typeof schema.type === 'undefined' && typeof schema.custom === 'undefined' && 'Object' == schema.constructor.name) {
		return formalizeObject({ type: 'Object', schema: schema }, schema, fn);
	}

	// Take care of array shortcuts.
	if ('Array' == schema.constructor.name) {
		if (schema.length === 0) return fn(new SchemaError(schema, 'Array must have exactly one schema.'));
		return formalizeArray({ type: 'Array', schema: schema[0] }, schema, fn);
	}

	// If schema is not an object - it is probably a shortcut.
	if (schema.constructor.name !== 'Object') {
		return formalizeAny({ type: schema }, fn);
	}

	// If type is a function we need to convert it to it's name - eg. 'String', 'Number', etc.
	if (typeof schema.type === 'function') {
		return formalizeAny(merge(schema, { type: schema.type.name }), fn);
	}

	var formalizedSchema = {};

	var validators = {};

	// Ensure type is supported.
	if (typeof schema.type !== 'undefined' && [ 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date' ].indexOf(schema.type) == -1) {
		return fn(new SchemaError(schema, 'Cannot validate schema of type ' + schema.type + '.'));
	}

	// Collect available validators.

	// Common validators to all types.
	var common = {
		'type': ['String'],
		'required': ['Boolean', 'String'],
		'default': true,
		'allowNull': ['Boolean'],
		'errors': [ 'Object' ],
		'custom': [ 'Function', 'Array' ]
	};

	var typeSpecific = {};

	// Find type specific validators.
	if (typeof schema.type !== 'undefined') {
		if ('Object' === schema.type) typeSpecific = {
			'schema': true,
			'unknownKeys': [ 'String' ]
		};
		if ('Array' === schema.type) typeSpecific = {
			'schema': true,
			'len': [ 'String', 'Number' ],
			'unique': [ 'Boolean' ]
		};
		if ('String' === schema.type) typeSpecific = {
			'match': [ 'RegExp', 'String' ],
			'trim': [ 'Boolean' ],
			'enum': [ 'Array' ]
		};
		if ('Number' === schema.type) typeSpecific = {
			'range': [ 'String', 'Number' ]
		};
	}

	// If custom validator is provided allow for options.
	if (typeof schema.custom !== 'undefined') {
		common = merge(common, { 'options': true });
	}

	validators = merge(common, typeSpecific);

	// Copy validators to formalizedSchema - checking
	// for non-supported validators at the same time.
	for (var key in schema) {
		if (typeof validators[key] === 'undefined') return fn(new SchemaError(
			schema,
			'Validator \'' + key + '\' is unknown in this context.'
		));

		if (validators[key] !== true && validators[key].indexOf(schema[key].constructor.name) == -1) {
			return fn(new SchemaError(
				schema,
				'Validator \'' + key + '\' must be of type(s) ' + validators[key].join(', ') + '.'
			));
		}

		formalizedSchema[key] = schema[key];

		// In order to stringify non-JSON types we add toJSON.
		if (formalizedSchema !== null && ['Object', 'Array', 'String', 'Number', 'Boolean'].indexOf(formalizedSchema[key].constructor.name) == -1) {
			var toJSON = rejectToJSON;
			if (formalizedSchema[key].constructor.name !== 'Function') {
				toJSON = formalizedSchema[key].toString;
			}
			Object.defineProperty(formalizedSchema[key], 'toJSON', {
				value: toJSON,
				enumerable: false
			});
		}

	}

	// Convert custom function to array
	if (typeof formalizedSchema.custom === 'function') {
		formalizedSchema.custom = [formalizedSchema.custom];
	}

	// Return error if required is invalid value
	if (typeof formalizedSchema.required === 'string' && formalizedSchema.required != 'implicit') {
		return fn(new SchemaError(
			schema,
			'Validator \'required\' must be a Boolean or String of value \'implicit\'.'
		));
	}

	// Check object unknownKeys
	if (typeof formalizedSchema.unknownKeys === 'string' &&
			['allow','deny','remove'].indexOf(formalizedSchema.unknownKeys) == -1) {
		return fn(new SchemaError(
			schema,
			'Validator \'unknownKeys\' must have value \'allow\', \'deny\' or \'remove\'.'
		));
	}

	// Check string enums
	if (typeof formalizedSchema.enum !== 'undefined') {
		if (formalizedSchema.enum.length < 1) {
			return fn(new SchemaError(
				schema,
				'Validator \'enum\' must have at least one item.'
			));
		}
		for (var idx in formalizedSchema.enum) {
			if (typeof formalizedSchema.enum[idx] !== 'string') {
				return fn(new SchemaError(
					schema,
					'Validator \'enum\' must be an array of strings.'
				));
			}
		}
	}

	// Check regular expression strings
	if (typeof formalizedSchema.match === 'string') {
		var m = formalizedSchema.match.match(/^\/(.*?)\/([igm]*)$/);
		formalizedSchema.match = m ? new RegExp(m[1], m[2]) : new RegExp(formalizedSchema.match);
	}

	if (typeof formalizedSchema.default === 'string') {
		var date;
		try {
			date = new Date(formalizedSchema.default);
		} catch(e) {}
		if (date) formalizedSchema.default = date;
	}

	if ('Object' == formalizedSchema.type) return formalizeObject(formalizedSchema, schema, fn);
	if ('Array' == formalizedSchema.type) return formalizeArray(formalizedSchema, schema, fn);

	return finalize(formalizedSchema, schema, fn);

}

module.exports = exports = formalizeAny;
