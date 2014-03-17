// Functions for information about titles
var _ = require('underscore');

var nsPageRegex = /^([^\:]*)\:?(.*)$/;

function namespace(title) {
	if (_.contains(title, ':')) {
		return title.match(nsPageRegex)[1];
	}
	return title;
}
exports.namespace = namespace;


function pagename(title) {
	if (_.contains(title, ':')) {
		return title.match(nsPageRegex)[2];
	}
	return title;
}
exports.pagename = pagename;


function pipetrick(target) {

	function stripParens(target) {
		var parens = target.match(/(.*)\s+\([^\)]*\)$/); // strip final parens
		return parens ? stripParens(parens[1]) : target;
	}
	return stripParens(pagename(target));
}
exports.pipetrick = pipetrick;