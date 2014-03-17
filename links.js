// Create and find links
var _      = require('underscore'),
	html   = require('./html'),
	titles = require('./titles');

exports.exports = { // exported all the way out
	redlinkClass: 'redlink',
	goodlinkClass: '',
	externalClass: 'external',
	internalClass: ''
};

var fallback = _.identity,
	namespaces = exports.exports.namespaces = {
		'': { // main namespace
			pages: {
				'home': '/'
			},
			fallback: function(target){
				return {target: target, exists: false};
			}
		},
		wikipedia: function(target){
			return {
				target: 'https://en.wikipedia.org/wiki/' + target,
				external: true
			};
		}
	};

Object.defineProperty(exports.exports, 'fallback', {
	enumerable: true,
	configurable: true,

	get: function(){return fallback},
	set: function(fb){fallback = fb}
}); // so that we keep a proper reference to the function


function link(match, target, text) {
	var props = findLink(target);
	return html.createTag('a', {
		href: props.target,
		'class': (
			(props.external ? exports.exports.externalClass : exports.exports.internalClass) +
			' ' +
			(props.exists ? exports.exports.goodlinkClass : exports.exports.redlinkClass)
		).trim()
	}, (text ? text.length == 1 ? titles.pipetrick(target) : text.slice(1) : target).trim());
}
exports.link = link;


function findLink(target, opts) {
	function find() {
		var ns = namespaces[titles.namespace(target)];
		if (ns) { // we have an action for this namespace
			if (_.isFunction(ns)) { // one function to handle all cases
				return ns(titles.pagename(target), opts);
			} else { // {pages: {}, fallback: function(){}}
				var pg = ns.pages[titles.pagename(target)];
				if (pg) { // we have an entry
					if (_.isFunction(pg)) {
						return pg(target, opts);
					} else { // a string location
						return pg;
					}
				} else {
					return ns.fallback(target, opts);
				}
			}
		} else { // no action, so use default fallback
			return fallback(target, opts);
		}
	}

	function fix(obj) {
		if (_.isObject(obj)) {
			return obj;
		} else {
			return {target: obj};
		}
	}

	return _.defaults(fix(find()), {external: false, exists: true});
}
exports.findLink = findLink;


var linkRegex = new RegExp(
	'\\[\\[' + // open
	'([^\\[\\]{}<>\\|]+)' + // not bad link targets - containing brackets, braces, <>, or pipe
	'(\\|[^\\[\\]{}\\|]*)?' + // optional acceptable link text - start with pipe; not brackets, braces, pipe; possible empty text
	'\\]\\]' // close
	, 'g');

function replaceLinks(text) {
	return text.replace(linkRegex, link);
}
exports.replaceLinks = replaceLinks;