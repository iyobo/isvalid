'use strict';

module.exports = exports = function(sync, fnc) {
	fnc.sync = sync;
	return fnc;
};
