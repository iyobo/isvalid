'use strict';

function ValidationError(keyPath, schema, validator, message) {

	this.name = 'ValidationError';
	this.keyPath = keyPath;
	this.schema = schema;
	this.validator = validator;
	this.message = message;

	this.stack = (new Error()).stack;

}

ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

ValidationError.fromError = function(keyPath, schema, validator, err) {
	var validationError = new ValidationError(keyPath, schema, validator, err.message);
	validationError.stack = err.stack;
	return validationError;
};

module.exports = exports = ValidationError;
