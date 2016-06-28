/* jslint evil: true */

'use strict';

var fs = require('fs');
var formalize = require('./formalize.js');
var tools = require('./tools.js');
var ValidationError = require('./errors/validation.js');

function toJavaScript(val) {
	if (typeof val === 'undefined') return 'undefined';
	if (val === null) return 'null';
	var idx;
	if ('Object' === val.constructor.name) {
		var keys = Object.keys(val);
		var keysAndValues = [];
		for (idx in keys) {
			keysAndValues.push(keys[idx] + ':' + toJavaScript(val[keys[idx]]));
		}
		if (val._nonFormalizedSchema) {
			keysAndValues.push('_nonFormalizedSchema: ' + toJavaScript(val._nonFormalizedSchema));
		}
		return '{' + keysAndValues.join(',') + '}';
	}
	if ('Array' === val.constructor.name) {
		var values = [];
		for (idx in val) {
			values.push(toJavaScript(val[idx]));
		}
		return '[' + values.join(',') + ']';
	}
	if ('String' === val.constructor.name) {
		return '"' + val.replace(/"/g, '\\"') + '"';
	}
	if ('Date' === val.constructor.name) {
		return 'new Date("' + val.toString() + '")';
	}	if (val.name && ['String', 'Number', 'Boolean', 'RegExp', 'Date'].indexOf(val.name) > -1) {
		return val.name;
	}
	if ('Function' === val.constructor.name) {
		return minify(val.toString());
	}
	return val.toString();
}

function errorMessage(schema, validator, defaultMessage) {
	return '"' + ((schema.errors || {})[validator] || defaultMessage).replace(/"/g, '\\"') + '"';
}

function ptrCode(ptrs, ptr) {
	ptrs.push(ptr);
	return 'options.ptrs[' + (ptrs.length - 1) + ']';
}

function finalize(err, code, fn) {
	if (fn.sync) return fn(err, code);
	tools.allowIO(fn, err, code);
}

var compilers = {
	'Object': function(schema, ptrs, fn) { var code =
			'function (obj, schema, fn, keyPath, options) {' +
				'if (obj) {' +
					'if (typeof obj !== "object") {' +
						'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type Object.') + '));' +
					'}' +
					'var key;' +
					'var validObject = {};';
		if (schema.unknownKeys !== 'remove') { code +=
					'for (key in obj) {' +
						'if (typeof schema.schema[key] === "undefined") {';
			if (schema.unknownKeys === 'allow') { code +=
							'validObject[key] = obj[key];';
			} else { code +=
							'return fn(new options.ValidationError(keyPath.concat([key]), schema._nonFormalizedSchema, "unknownKeys", ' + errorMessage(schema, 'unknownKeys', 'Unknown key.') + '));';
			}
			code +=
						'}' +
					'}';
		}
		var schemaCopy = {};
		for (var key in schema.schema) schemaCopy[key] = schema.schema[key];
		return (function next(fn) {
			for (var key in schemaCopy) break;
			if (!key) {
				return fn(null,
					'return complete(validObject, schema, fn, keyPath, options);'
				);
			}
			var keySchema = schemaCopy[key];
			delete schemaCopy[key];
			return compileAny(keySchema, ptrs, tools.sync(fn.sync, function(err, keycode) {
				if (err) return fn(err);
				return next(tools.sync(fn.sync, function(err, subcode) {
					if (err) return fn(err);
					return fn(null,
					'return (' + keycode + ')(obj["' + key + '"], schema.schema["' + key + '"], function(err, validData) {' +
						'if (err) return fn(err);' +
						'if (typeof validData !== "undefined") validObject["' + key + '"] = validData;' +
						subcode +
					'}, keyPath.concat(["' + key + '"]), options);'
					);
				}));
			}));
		})(tools.sync(fn.sync, function(err, subcode) {
			if (err) return fn(err);
			return fn(null, code +
				subcode +
				'}' +
				'return complete(obj, schema, fn, keyPath, options);' +
			'}'
			);
		}));
	},
	'Array': function(schema, ptrs, fn) { var code =
			'function (arr, schema, fn, keyPath, options) {' +
				'if (arr) {' +
					'if (!(data instanceof Array)) {' +
						'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type Array.') + '));' +
					'}' +
					'var validArray = [];' +
					'return (function next(idx) {' +
						'if (idx === arr.length) {';
		if (schema.len) { code +=
							'if (!tools.testRange(' + toJavaScript(schema.len) + ', validArray.length)) {' +
								'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "len", ' + errorMessage(schema, 'len', 'Array length is not within range of \'' + schema.len + '\'.') + '));' +
							'}';
		}
		if (schema.unique) { code +=
							'return tools.unique(validArray, function(res) {' +
								'if (res) return complete(validArray, schema, fn, keyPath, options);' +
								'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "unique", ' + errorMessage(schema, 'unique', 'Array is not unique.') + '));' +
							'})';
		} else { code +=
							'return complete(validArray, schema, fn, keyPath, options);';
		}
		code +=
						'}';
		return compileAny(schema.schema || {}, ptrs, tools.sync(fn.sync, function(err, subcode) {
			if (err) return fn(err);
			return fn(null, code +
						'return (' + subcode + ')(arr[idx], schema.schema || {}, function(err, validData) {' +
							'if (err) return fn(err);' +
							'validArray.push(validData);' +
							'return next(idx + 1);' +
						'}, keyPath.concat([idx.toString()]), options);' +
					'})(0);' +
				'}' +
			'}');
		}));
	},
	'String': function(schema, ptrs, fn) { var code =
			'function (str, schema, fn, keyPath, options) {' +
				'var validStr = str;' +
				'if (typeof validStr !== "string") {' +
					'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type String.') + '));' +
				'}';
		if (schema.trim === true) { code +=
				'validStr = validStr.replace(/^\\s+|\\s+$/g,"");';
		}
		if (schema.match) { code +=
				'if (!' + schema.match.toString() + '.test(validStr)) {' +
					'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "match", ' + errorMessage(schema,'match','Does not match expression ' + schema.match.source + '.') + '));' +
				'}';
		}
		if (schema.enum) { code +=
				'if (' + toJavaScript(schema.enum) + '.indexOf(validStr) === -1) {' +
					'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "enum", ' + errorMessage(schema,'enum','Possible values are ' + schema.enum.map(function(val) {
						return '\'' + val + '\'';
					}).reduce(function(prev, cur, idx, arr) {
						return prev + (idx === arr.length - 1 ? ' and ' : ', ') + cur;
					}) + '.') + '));' +
				'}';
		}
		return fn(null, code +
				'return complete(validStr, schema, fn, keyPath, options);' +
			'}'
		);
	},
	'Number': function(schema, ptrs, fn) { var code =
			'function(num, schema, fn, keyPath, options) { ' +
				'var validNum = parseFloat(num);' +
				'if (typeof validNum !== "number" || isNaN(validNum)) {' +
					'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type Number.') + '));' +
				'}';
		if (schema.range) { code +=
				'if (!tools.testRange(' + toJavaScript(schema.range) + ', validNum)) {' +
					'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "range", ' + errorMessage(schema, 'range', 'Not within range of ' + schema.range + '.') + '));' +
				'}';
		}
		return fn(null, code +
				'return complete(validNum, schema, fn, keyPath, options);'+
			'}'
		);
	},
	'Boolean': function(schema, ptrs, fn) {
		return fn(null,
			'function(val, schema, fn, keyPath, options) {' +
				'if (val) {' +
					'if (typeof val === "string" && /^true|false$/i.test(val)) {' +
						'val = /^true$/i.test(val);' +
					'}' +
					'if (typeof val !== "boolean") {' +
						'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type Boolean.') + '));' +
					'}' +
				'}' +
				'return complete(val, schema, fn, keyPath, options);' +
			'}'
		);
	},
	'Date': function(schema, ptrs, fn) {
		return fn(null,
			'function(val, schema, fn, keyPath, options) {' +
				'if (val) {' +
					'if (typeof val === "string") {' +
						'var date = new Date(val);' +
						'if (!isNaN(date.getDate())) return complete(date, schema, fn, keyPath, options);' +
						'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Date string must be in ISO-8601 format.') + '))' +
					'}' +
					'if (!(val instanceof Date)) return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "type", ' + errorMessage(schema, 'type', 'Is not of type Date.') + '))' +
				'}' +
				'return complete(val, schema, fn, keyPath, options)' +
			'}'
		);
	}
};

function compileAny(schema, ptrs, fn) {

	var code = 'function(data, schema, fn, keyPath, options) {';

	code += 'function complete(data, schema, fn, keyPath, options) {'; {
		code += 'var result = data;';
		if (typeof schema.custom === 'undefined' || schema.custom.length === 0) {
			code += 'return finalize(result, fn);';
		} else {
			code +=
				(function next(idx) {
					if (idx === schema.custom.length) return 'return finalize(result, fn);';
					var custom = schema.custom[idx];
					var customCode = ptrCode(ptrs, custom);
					if (custom.length < 3) {
						return 'var res;' +
							'try {' +
								'res = (' + customCode + '|| schema.custom[' + idx + '])(result, schema);' +
							'} catch(err) {' +
								'return fn(options.ValidationError.fromError(keyPath, schema._nonFormalizedSchema, "custom", err));' +
							'}' +
							'if (typeof res !== "undefined") result = res;' +
							next(idx + 1);
					} else {
						return 'return (' + customCode + '|| schema.custom[' + idx + '])(result, schema, function(err, validData) {' +
							'if (err) return fn(options.ValidationError.fromError(keyPath, schema._nonFormalizedSchema, "custom", err));' +
							'result = validData;' +
							next(idx + 1) +
						'});';
					}
				})(0, '');
		}
	} code += '}';

	// Handle missing data.
	code += 'if (typeof data === "undefined" || data === null) {'; {

		// Handle null.
		code += 'if (data === null) ';
		if (schema.allowNull) code += 'return complete(data, schema, fn, keyPath, options);';
		else code += 'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "allowNull", ' + errorMessage(schema, 'allowNull', 'Data cannot be null.') + '));';

		if (typeof schema.default !== 'undefined') {
			if (typeof schema.default === 'function') {
				var defaultPtr = ptrCode(ptrs, schema.default);
				if (schema.default.length === 0) { // Sync
					code += 'return complete((' + defaultPtr + ' || schema.default)(), schema, fn, keyPath, options);';
				} else { // Async
					code +=
						'return (' + defaultPtr + ' || schema.default)(function(defaultValue) {' +
							'complete(defaultValue, schema, fn, keyPath, options);' +
						'});';
				}
			} else {
				code += 'return complete(' + schema.default + ', schema, fn, keyPath, options);';
			}
		} else if (schema.required === true) {
			code += 'return fn(new options.ValidationError(keyPath, schema._nonFormalizedSchema, "required", ' + errorMessage(schema, 'required', 'Data is required.') + '));';
		} else {
			code += 'return complete(data, schema, fn, keyPath, options);';
		}

	} code += '}';

	if (typeof schema.type === 'undefined')	return finalize(null, code + 'return complete(data, schema, fn, keyPath, options); }', fn);

	return compilers[schema.type](schema, ptrs, tools.sync(fn.sync, function(err, fncCode) {
		return finalize(null, code + 'return (' + fncCode + ')(data, schema, function(err, validData) { if (err) return fn(err); return complete(validData, schema, fn, keyPath, options); }, keyPath, options); }', fn);
	}));

}

function minify(js) {
	return js.replace('\'use strict\';', '')
	         .replace(/\/\/.*?\n/g, '')
	         .replace(/\t+/g, '')
	         .replace(/\n/g, '');
}

function readFileToVar(varName, file) {
	return 'var ' + varName + ' = (function(module, exports) {' + minify(fs.readFileSync(file, 'utf8')) + ' return module.exports;})({}, {});';
}

// We assume the isvalid module is loaded at application load, and therefore we just do this sync.
var includeTools = readFileToVar('tools', __dirname + '/tools.js') +
                   	readFileToVar('ValidationError', __dirname + '/errors/validation.js');

function compile(schema, fn) {

	fn = fn || tools.sync(true, function(err, ret) {
		if (err) throw err;
		return ret;
	});

	if (typeof schema === 'undefined') return fn(new Error('Missing schema parameter.'));

	if (typeof schema._nonFormalizedSchema === 'undefined') {
		return formalize(schema, tools.sync(fn.sync, function(err, formalizedSchema) {
			if (err) return fn(err);
			return compile(formalizedSchema, fn);
		}));
	}

	var ptrs = [];

	return compileAny(schema, ptrs, tools.sync(fn.sync, function(err, code) {
		if (err) return fn(err);

		var checkParametersCode = 'if (typeof fn === "undefined") throw new Error("Missing parameter fn.");';

		var finalizeCode = 'function finalize(data, fn) { tools.allowIO(fn, null, data);}\n';

		code = '(' + code + ')(data, injectedSchema || ' + toJavaScript(schema) + ', fn, keyPath || [], (options || { ptrs: [], ValidationError: ValidationError }));';

		//console.log('(function (data, injectedSchema, fn, keyPath, options) {' + includeTools + checkParametersCode + finalizeCode + code + '})(undefined, undefined, function(err, validData) { console.log(err, validData); });');
		var fnc = new Function('data','injectedSchema','fn','keyPath','options', includeTools + checkParametersCode + finalizeCode + code);

		var res = function(data, fn, keyPath) {
			//console.log('(function (data, injectedSchema, fn, keyPath, options) {' + includeTools + checkParametersCode + finalizeCode + code + '})(' + toJavaScript(data) + ', undefined, function(err, validData) { console.log(err, validData); });');

			return fnc(data, schema, fn, keyPath, {
				ptrs: ptrs,
				ValidationError: ValidationError
			});
		};

		Object.defineProperty(res, '_formalizedSchema', {
			value: schema,
			enumerable: false,
			writable: false
		});

		return fn(null, res);

	}));

}

module.exports = exports = compile;
