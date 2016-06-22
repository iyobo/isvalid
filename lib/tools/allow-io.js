'use strict';

module.exports = exports = function(fnc) {
	var args = Array.apply(null, arguments).slice(1);
	(setImmediate || (process || {}).nextTick || setTimeout)(function() {
		fnc.apply(null, args);
	});
};
