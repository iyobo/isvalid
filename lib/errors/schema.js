'use strict';

function SchemaError(schema, message) {

	this.name = 'SchemaError';
	this.schema = schema;
	this.message = message;

	this.stack = (new Error()).stack;

}

SchemaError.prototype = Object.create(Error.prototype);
SchemaError.prototype.constructor = SchemaError;

module.exports = exports = SchemaError;
