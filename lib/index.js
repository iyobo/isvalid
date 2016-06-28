'use strict';

var	compile = require('./compile.js');

function isvalid(data, schema, fn, keyPath) {

	if (typeof schema === 'undefined') throw new Error('Missing parameter schema.');
	if (typeof fn === 'undefined') throw new Error('Missing parameter fn.');

	if (typeof schema._formalizedSchema === 'undefined') {
		return compile(schema, function(err, schema) {
			isvalid(data, schema, fn, keyPath);
		});
	}

	schema(data, fn, keyPath);

}

module.exports = exports = isvalid;

exports.formalize = require('./formalize.js');
exports.compile = require('./compile.js');
exports.validate = require('./middleware/');
