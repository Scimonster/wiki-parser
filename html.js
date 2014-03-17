// HTML data methods
var _ = require('underscore');

// Return an array where odd keys are outside the tag and even are inside
function extractTags(text, tag) {
	if (_.isString(tag)) {
		var openTag = '<' + tag + '[^>]*>',
			closeTag = '<\/' + tag + '>',
			split = text.split(new RegExp('(' + openTag + '|' + closeTag + ')')),
			open = 0,
			ret = [];
		split.forEach(function(t, i){
			if (t.match(openTag)) {
				open++;
			}
			if (t.match(closeTag)) {
				open--;
			}
			if (open == 0 && !t.match(closeTag)) {
				ret.push(t);
				if (i != split.length -1) {
					ret.push('');
				}
			} else {
				ret[ret.length - 1] += t;
			}
		});
		return ret;
	} else if (_.isArray(tag)) {
		return tag.reduce(function(text, tag){
			return _.flatten(text.map(function(t, i){
				return i % 2 ? t : extractTags(t, tag);
			}));
		}, [text]);
	} else {
		return text;
	}
}
exports.extractTags = extractTags;


// generate HTML for a tag
function createTag(tagName, attributes, textContent, opts) {
	if (!_.isObject(attributes)) {
		attributes = {};
	}
	if (!_.isObject(opts)) {
		opts = {};
	}
	return '<' + tagName.toLowerCase() + // open tag
		(Object.keys(attributes).length ? _.reduce(attributes, function(attrs, val, name){
			return attrs + ' ' + name + '=' + JSON.stringify(val.toString());
		}, '') : '') + (opts.selfClose ? ' />' : '>' + // attributes
			(opts.escape ? _.escape(textContent) : textContent).toString().trim() + // content
			'</' + tagName.toLowerCase() + '>');
}
exports.createTag = createTag;


exports.classes = function(classList) {
	return _.uniq(_.compact(classList)).join(' ');
};