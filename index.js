var _ = require('underscore'), extend = require('extend'); // _.extend doesn't support deep

module.exports = exports = function(text, opts) { // setting exports because it will be easier
	var parsed = preParse(text, opts);
	return {
		text: parsed.join(''),
		parse: function(){
			return parser(parsed, opts);
		},
		preParsed: parsed
	};
};

exports.samples = [
	"== Talk Page ==\nmain\n:my ''reply'' ~~~~",
	'[[/|homepage]] and [http://google.com Google]',
	'<div class="class">stuff</div>',
	'<nowiki allow="sign">[[link target|title]]\nsign: ~~~~\nescape markup: <nowiki>markup</nowiki></nowiki>',
	'{|\n| 1@1 || 1@2\n|-\n| 2@1 || 2@2\n|}',
	'~\n~~\n~~~\n~~~~\n~~~~~\n~~~~~~\n~~~~~~~\n~~~~~~~~',
	'<span>pre</span><div id="id"><p><div class="class">mid</div><div class="class">again</div></p></div><div id="second"></div><span>post</span>',
	'[[link]] <nowiki>[[not a link]]<nomarkup><nowiki>~~~~</nowiki></nomarkup></nowiki> <nomarkup>~~~~</nomarkup> real sign ~~~~ <nowiki>~~~~</nowiki>',
	'<h1>head</h1>content<h4>sub</h4><h2 title="attr"></h2>',
	'<nowiki allow="sign">[[link target|title]]\nsign: ~~~~\nescape markup: <nowiki>markup</nomarkup></nowiki>'
];

var defaults = exports.defaults = {
	page: 'Page',
	author: 'User'
};

var links = exports.links = {
	namespaces: {
		'': _.identity, // main namespace
		wikipedia: function(target){
			return {
				target: 'https://en.wikipedia.org/wiki/' + target,
				external: true
			};
		}
	},
	fallback: _.identity
}

var tags = exports.tags = {};
var nowikiTags = exports.nowikiTags = ['nowiki', 'nomarkup'];

var linkRegex = exports.linkRegex = new RegExp(
	'\\[\\[' + // open
	'([^\\[\\]{}<>\\|]+)' + // not bad link targets - containing brackets, braces, <>, or pipe
	'(\\|[^\\[\\]{}\\|]*)?' + // optional acceptable link text - start with pipe; not brackets, braces, pipe; possible empty text
	'\\]\\]' // close
	, 'g');


// Parse a block of pre-parsed wikitext
function parser(text, opts) {
	opts = _.extend({}, defaults, opts);

	return text.map(function(line, i){
		if (i % 2) { // inside of <nowiki>
			return line;
		} else {
			return extractHeaders(
				line.replace(/'''([^''']+)'''/g, createTag('strong', {}, '$1')). // bold
				replace(/''([^'']+)''/g, createTag('em', {}, '$1')).
				replace(linkRegex, link)
			).map(function(head){ // create headers
				if (head.level) {
					return createTag('h' + head.level, opts.headerHTML, head.name);
				} else {
					return head.text;
				}
			}).map(function(line){ // start of line actions
				return line;
			});
		}
	}).join('');
}

// Preparse a block of wikitext
// Return a function to fully parse it
function preParse(text, opts) {
	opts = _.extend({}, defaults, opts);

	if (!_.isString(text)) {
		throw new TypeError('not a string passed to preParse()');
	}

	return extractTags(text, nowikiTags).map(function(t, i){ // text is now of the format [outside <nowiki>, inside <nowiki>, etc]
		// replace sigs outside of <nowiki> blocks
		return i % 2 ? t : t.replace(/~{3,5}/g, function s(sig){ // replace sigs
			return sig.length === 3 ? sign(opts) : sig.length === 5 ? (new Date).toUTCString() : s('~~~') + ' ' + s('~~~~~');
		});
	});
}


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

function extractHeaders(text) {
	function htmlHeaders(text) {
		return extractTags(text, ['h1','h2','h3','h4','h5','h6']).map(function(line, i){
			if (i % 2) { // is a header
				var count = line.match(/<\/h(\d)>$/);
				return {
					level: +count[1],
					name: line.slice(line.indexOf('>')+1, count.index),
					text: line
				};
			} else {
				return {
					level: 0,
					name: null,
					text: line
				};
			}
		});
	}

	return _.flatten(text.split('\n').map(function(line){
		if (line[0] == '=') { // is a header
			var count = _.min([line.match(/^={1,6}/)[0].length, line.match(/={1,6}$/)[0].length]);
			return {
				level: count,
				name: line.slice(count, -count),
				text: line
			};
		} else {
			return htmlHeaders(line);
		}
	}));
}
exports.extractHeaders = extractHeaders;


// create a signature
function sign(opts) {
	if ('signature' in opts) {
		return opts.signature;
	}
	if ('author' in opts) {
		return sign.def(opts.author);
	}
	return '~~~~';
}

sign.def = function(name) {
	return '-- ' + name;
};

exports.sign = sign;


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
			return attrs + ' ' + name + '=' + JSON.stringify(val);
		}, '') : '') + (opts.selfClose ? ' />' : '>' + // attributes
			(opts.escape ? _.escape(textContent) : textContent).trim() + // content
			'</' + tagName.toLowerCase() + '>');
}
exports.createTag = createTag;


function link(match, target, text) {
	return createTag('a', {href: findLink(target)}, (text ? text.length == 1 ? pipetrick(target) : text.slice(1) : target).trim());
}


function findLink(target) {
	return target;
}


function pipetrick(target) {
	if (_.contains(target, ':')) {
		target = target.match(/([^\:]*)\:?(.*)/)[2];
	}

	function stripParens(target) {
		var parens = target.match(/(.*)\s+\([^\)]*\)$/); // strip final parens
		return parens ? stripParens(parens[1]) : target;
	}
	return stripParens(target);
}
exports.pipetrick = pipetrick;