'use strict';

var merge = require('merge'),
    SchemaError = require('./errors/SchemaError.js');

var finalize = function(formalizedSchema, nonFormalizedSchema, fn, sync) {

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
	if (fn) {
		if (sync) return fn(formalizedSchema);
		else setImmediate(fn, formalizedSchema);
	}

};

var formalizeObject = function(formalizedSchema, nonFormalizedSchema, fn, sync) {

	// If no sub-schema is provided we consider the schema final.
	if (typeof formalizedSchema.schema === 'undefined') return finalize(formalizedSchema, nonFormalizedSchema, fn, sync);
	if (formalizedSchema.schema.constructor.name !== 'Object') throw new SchemaError(formalizedSchema.schema, 'Object schemas must be an object.');

	// Build new formalized schema into this.
	var formalizedSubschema = {};

	var keys = Object.keys(formalizedSchema.schema);

	(function formalizeNextKey(idx) {

		// If idx equals keys length - we are done.
		if (idx == keys.length) {
			formalizedSchema.schema = formalizedSubschema;
			formalizedSchema = finalize(formalizedSchema, nonFormalizedSchema, fn, sync);
			return;
		}

		var key = keys[idx];

		formalizeAny(formalizedSchema.schema[key], function(formalizedKey) {

			// Apply implicit required if sub-schema is required.
			if (formalizedSchema.required === undefined || formalizedSchema.required == 'implicit') {
				if (formalizedKey.required === true) formalizedSchema.required = true;
			}

			formalizedSubschema[key] = formalizedKey;

			if (sync) return formalizeNextKey(idx + 1);
			else setImmediate(formalizeNextKey, idx + 1);

		}, sync);

	})(0);

	return formalizedSchema;

};

var formalizeArray = function(formalizedSchema, nonFormalizedSchema, fn, sync) {

	// formalizedSchema has been pre-processed by formalizeAny, so
	// we only need to formalize the sub-schema.

	// If no sub-schema is provided we consider the schema final.
	if (typeof formalizedSchema.schema === 'undefined') return finalize(formalizedSchema, nonFormalizedSchema, fn, sync);

	return formalizeAny(formalizedSchema.schema, function(formalizedSubschema) {

		formalizedSchema.schema = formalizedSubschema;

		// Apply implicit required if sub-schema has required data.
		if (typeof(formalizedSchema.required) === 'undefined' || formalizedSchema.required === 'implicit') {
			if (formalizedSchema.schema.required === true) formalizedSchema.required = true;
		}

		return finalize(formalizedSchema, nonFormalizedSchema, fn, sync);

	}, sync);

};

var formalizeAny = function(schema, fn, sync) {

	// If no fn we operate sync.
	if (fn === undefined) {
		fn = function(s) { return s; };
		sync = true;
	}

	if (!schema) {
		throw new SchemaError(schema, 'No schema provided');
	}

	// If schema is already formalized we just call back.
	if (schema._nonFormalizedSchema !== undefined) return fn(schema);

	// Take care of object shortcuts
	if (typeof schema.type === 'undefined' && typeof schema.custom === 'undefined' && 'Object' == schema.constructor.name) {
		return formalizeObject({ type: 'Object', schema: schema }, schema, fn, sync);
	}

	// Take care of array shortcuts.
	if ('Array' == schema.constructor.name) {
		if (schema.length === 0) throw new SchemaError(schema, 'Array must have exactly one schema.');
		return formalizeArray({ type: 'Array', schema: schema[0] }, schema, fn, sync);
	}

	// If schema is not an object - it is probably a shortcut.
	if (schema.constructor.name !== 'Object') {
		return formalizeAny({ type: schema }, fn, sync);
	}

	// If type is a function we need to convert it to it's name - eg. 'String', 'Number', etc.
	if (typeof schema.type === 'function') {
		return formalizeAny(merge(schema, { type: schema.type.name }), fn, sync);
	}

	var formalizedSchema = {};

	var validators = {};

	// Ensure type is supported.
	if (typeof schema.type !== 'undefined' && [ 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date' ].indexOf(schema.type) == -1) {
		throw new SchemaError(schema, 'Cannot validate schema of type ' + schema.type + '.');
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
			'match': [ 'RegExp' ],
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
		if (typeof validators[key] === 'undefined') throw new SchemaError(
			schema,
			'Validator \'' + key + '\' is unknown in this context.'
		);

		if (validators[key] !== true && validators[key].indexOf(schema[key].constructor.name) == -1) {
			throw new SchemaError(
				schema,
				'Validator \'' + key + '\' must be of type(s) ' + validators[key].join(', ') + '.'
			);
		}

		formalizedSchema[key] = schema[key];
	}

	// Convert custom function to array
	if (typeof formalizedSchema.custom === 'function') {
		formalizedSchema.custom = [formalizedSchema.custom];
	}

	// Throw error if required is invalid value
	if (typeof formalizedSchema.required === 'string' && formalizedSchema.required != 'implicit') {
		throw new SchemaError(
			schema,
			'Validator \'required\' must be a Boolean or String of value \'implicit\'.'
		);
	}

	// Check object unknownKeys
	if (typeof formalizedSchema.unknownKeys === 'string' &&
			['allow','deny','remove'].indexOf(formalizedSchema.unknownKeys) == -1) {
		throw new SchemaError(
			schema,
			'Validator \'unknownKeys\' must have value \'allow\', \'deny\' or \'remove\'.'
		);
	}

	// Check string enums
	if (typeof formalizedSchema.enum !== 'undefined') {
		if (formalizedSchema.enum.length < 1) {
			throw new SchemaError(
				schema,
				'Validator \'enum\' must have at least one item.'
			);
		}
		for (var idx in formalizedSchema.enum) {
			if (typeof formalizedSchema.enum[idx] !== 'string') {
				throw new SchemaError(
					schema,
					'Validator \'enum\' must be an array of strings.'
				);
			}
		}
	}

	if ('Object' == formalizedSchema.type) return formalizeObject(formalizedSchema, schema, fn, sync);
	if ('Array' == formalizedSchema.type) return formalizeArray(formalizedSchema, schema, fn, sync);

	return finalize(formalizedSchema, schema, fn, sync);

};

exports.formalize = module.exports.formalize = formalizeAny;
