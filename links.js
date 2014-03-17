// Create and find links
var _      = require('underscore'),
	html   = require('./html'),
	titles = require('./titles'),
	externalLinkCount;

exports.exports = { // exported all the way out
	redlinkClass: 'redlink',
	goodlinkClass: '',
	externalClass: 'external',
	plainExternalClass: 'plain-external',
	internalExternalClass: 'internal-external',
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
		'class': html.classes([
			props.external ? exports.exports.internalExternalClass : exports.exports.internalClass,
			props.exists ? exports.exports.goodlinkClass : exports.exports.redlinkClass
		])
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


function externalLink(match, target, text) {
	return html.createTag('a', {
		href: target,
		'class': exports.exports.externalClass
	}, text || ('[' + (++externalLinkCount) + ']'));
}

function plainExternalLink(match, url) {
	return match.slice(0, match.indexOf(url)) + html.createTag('a', { // keep weird leading space
		href: url,
		'class': html.classes([exports.exports.externalClass, exports.exports.plainExternalClass])
	}, url);
}


var linkRegex = new RegExp(
		'\\[\\[' + // open
		'([^\\[\\]{}<>\\|]+)' + // not bad link targets - containing brackets, braces, <>, or pipe
		'(\\|[^\\[\\]{}\\|]*)?' + // optional acceptable link text - start with pipe; not brackets, braces, pipe; possible empty text
		'\\]\\]', // close
	'g'), externalLinkRegex = new RegExp(
		'\\[' + // open
		'([a-z]+\\:' + // protocol
		'[^\\s\\]]+)' + // url
		'\\s*' + // whitespace to separate text
		'([^\\]]*)' + // link text
		'\\]', // close
	'g'), plainExternalLinkRegex = new RegExp(
		// lifted from http://stackoverflow.com/questions/11863847/regex-to-match-urls-but-not-urls-in-hyperlinks
		'(?:^|[^"\'])' + // if it is at the beginning, or does not come after a quote
		'(' + // start capturing url
			'(ftp|http|https|file):\\/\\/' + // protocol
			'[\\S]+' + // non-whitespace url
			'(\\b|$)' + // end of url - word or end of string
		')', // finish capture
	'gi');

function replaceLinks(text) {
	externalLinkCount = 0;
	return text.replace(linkRegex, link).replace(externalLinkRegex, externalLink).replace(plainExternalLinkRegex, plainExternalLink);
}
exports.replaceLinks = replaceLinks;