var _      = require('underscore'),
	html   = require('./html'),
	titles = require('./titles'),
	links  = require('./links');

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
	"== Talk Page ==\nmain\n:my ''reply'' with a [[link]] ~~~~",
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

var tags = exports.tags = {};
var nowikiTags = exports.nowikiTags = ['nowiki', 'nomarkup'];


// Parse a block of pre-parsed wikitext
function parser(text, opts) {
	opts = _.extend({}, defaults, opts);

	return text.map(function(line, i){
		if (i % 2) { // inside of <nowiki>
			return line;
		} else {
			return extractHeaders(links.replaceLinks( // create links
				line.replace(/'''([^''']+)'''/g, html.createTag('strong', {}, '$1')). // bold
				replace(/''([^'']+)''/g, html.createTag('em', {}, '$1'))
			)).map(function(head){ // create headers
				if (head.level) {
					return html.createTag('h' + head.level, opts.headerHTML, head.name);
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

	return html.extractTags(text, nowikiTags).map(function(t, i){ // text is now of the format [outside <nowiki>, inside <nowiki>, etc]
		// replace sigs outside of <nowiki> blocks
		return i % 2 ? t : t.replace(/~{3,5}/g, function s(sig){ // replace sigs
			return sig.length === 3 ? sign(opts) : sig.length === 5 ? (new Date).toUTCString() : s('~~~') + ' ' + s('~~~~~');
		});
	});
}


function extractHeaders(text) {
	function htmlHeaders(text) {
		return html.extractTags(text, ['h1','h2','h3','h4','h5','h6']).map(function(line, i){
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



exports.html = html;
exports.titles = titles;
exports.links = links;