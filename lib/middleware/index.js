'use strict';

var formalize = require('../formalize.js'),
	isvalid = require('../validate.js');

module.exports = exports = {};

exports.body = function(schema, options) {

	var formalizedSchema = formalize(schema);

	return function(req, res, next) {
		isvalid(req.body, formalizedSchema, function(err, validData) {
			req.body = validData;
			next(err);
		}, ['body'], options);
	};

};

exports.query = function(schema, options) {

	var formalizedSchema = formalize(schema);

	return function(req, res, next) {
		isvalid(req.query, formalizedSchema, function(err, validData) {
			req.query = validData;
			next(err);
		}, ['query'], options);
	};

};

exports.param = function(schema, options, cb) {

	if (typeof(cb) === 'undefined' && typeof(options) === 'function') {
		cb = options;
		options = undefined;
	}

	var formalizedSchema = formalize(schema);

	return function(req, res, next, val, id) {
		isvalid(req.params[id], formalizedSchema, function(err, validData) {
			req.params[id] = validData;
			if (!err && cb) {
				return cb(req, res, next);
			} else {
				next(err);
			}
		}, [id], options);
	};

};
