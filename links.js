// Create and find links
var _      = require('underscore'),
	html   = require('./html'),
	titles = require('./titles');

var fallback = _.identity,
	namespaces = exports.namespaces = {
		'': _.identity, // main namespace
		wikipedia: function(target){
			return {
				target: 'https://en.wikipedia.org/wiki/' + target,
				external: true
			};
		}
	};

Object.defineProperty(exports, 'fallback', {
	enumerable: true,
	configurable: true,

	get: function(){return fallback},
	set: function(fb){fallback = fb}
}); // so that we keep a proper reference to the function


function link(match, target, text) {
	return html.createTag('a', {href: findLink(target)}, (text ? text.length == 1 ? titles.pipetrick(target) : text.slice(1) : target).trim());
}
exports.link = link;


function findLink(target) {
	return target;
}
exports.findLink = findLink;


var linkRegex = exports.linkRegex = new RegExp(
	'\\[\\[' + // open
	'([^\\[\\]{}<>\\|]+)' + // not bad link targets - containing brackets, braces, <>, or pipe
	'(\\|[^\\[\\]{}\\|]*)?' + // optional acceptable link text - start with pipe; not brackets, braces, pipe; possible empty text
	'\\]\\]' // close
	, 'g');

function replaceLinks(text) {
	return text.replace(linkRegex, link);
}
exports.replaceLinks = replaceLinks;