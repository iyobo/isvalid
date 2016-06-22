'use strict';

describe('tools', function() {
	require('./tools/ranges.js');
	require('./tools/equals.js');
	require('./tools/unique.js');
});
describe('schema', function() {
	require('./schema.js');
});
describe('validator', function() {
	require('./validate.js');
});
describe('middleware', function() {
	require('./middleware/');
});
