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
		preParsed: parsed,
		orig: text
	};
};

exports.samples = [
	"== Talk Page ==\nmain\n:my ''reply'' with a [[link]] ~~~~",
	'[[/|homepage]] and [http://google.com Google] and http://example.com/',
	'<div class="class">stuff</div>',
	'<nowiki allow="sign">[[link target|title]]\nsign: ~~~~\nescape markup: <nowiki>markup</nowiki></nowiki>',
	'{|\n| 1@1 || 1@2\n|-\n| 2@1 || 2@2\n|}',
	'~\n~~\n~~~\n~~~~\n~~~~~\n~~~~~~\n~~~~~~~\n~~~~~~~~',
	'<span>pre</span><div id="id"><p><div class="class">mid</div><div class="class">again</div></p></div><div id="second"></div><span>post</span>',
	'[[link]] <nowiki>[[not a link]]<nomarkup><nowiki>~~~~</nowiki></nomarkup></nowiki> <nomarkup>~~~~</nomarkup> real sign ~~~~ <nowiki>~~~~</nowiki>',
	'<h1>head</h1>content<h4>sub</h4><h2 title="attr"></h2>',
	'<nowiki allow="sign">[[link target|title]]\nsign: ~~~~\nescape markup: <nowiki>markup</nomarkup></nowiki>',
	'*1\n*2\n**2.1\n**2.2\n*3',
	'#a\n#b\n##ba\n##bb\n#c',
	'*1\n**2\n* 3\n*#4\n# 5\n##6\n#*7',
	':ding ding ; dong\n:ding ding\n;dong',
	'*1\n**2\n* 3\n*#4\n# 5\n##6\n#*7\n\n pre\n more pre\n * well?\n * and?\n * \'\'\'bold\'\'\'\n\n:ding ding ; dong\n:ding ding\n;dong\n\n[[link name and text]]\n[[link loc|text]]\n[[link loc|{{{1}}}]]\n[[{{{1|1}}}|{{{2}}}]]\n[[{{{1}}}|{{{2}}}]]\n[[{{{1}}}]]\n[[{{{1|1}}}]]\n[[{{{1}}} 2]]\n[[{{{1|1}}} 2]]\n[[link|{{smile}}]]\n\n[[link]]]\n[[]link]]\n\n[[plain|]]\n[[ns:link|]]\n[[link (paren)|]]\n[[link (p1) (p2)|]]\n[[link (p1) more|]]\n[[ns:ns2:link|]]\n\n==lvl2==\n\n pre\n\n*abc\n *abc\n\n ===lvl3===\n'
];

var defaults = exports.defaults = {
	page: 'Page',
	user: 'User'
};

var tags = exports.tags = {};
var nowikiTags = exports.nowikiTags = ['nowiki', 'nomarkup'];


// Parse a block of pre-parsed wikitext
function parser(text, opts) {
	opts = _.defaults(opts || {}, defaults);

	return text.map(function(line, i){
		if (i % 2) { // inside of <nowiki>
			return line;
		} else {
			return extractHeaders(links.replaceLinks( // create links
				line.replace(/'''([^''']+)'''/g, html.createTag('strong', {}, '$1')). // bold
				replace(/''([^'']+)''/g, html.createTag('em', {}, '$1'))
			)).map(function(head){ // create headers
				if (head.level) { // a header
					return html.createTag('h' + head.level, opts.headerHTML, head.name);
				} else { // do start-of-line stuff (lists, pre)
					return lists(monospace(head.text)).join('');
				}
			}).join('');
		}
	}).join('').trim();
}

// Preparse a block of wikitext
// Return a function to fully parse it
function preParse(text, opts) {
	opts = _.defaults(opts || {}, defaults);

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
				return line;
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
	})).reduce(function(memo, line){
		if (_.isString(line) && _.isString(_.last(memo))) {
			return _.initial(memo).concat(_.last(memo) + '\n' + line);
		} else {
			return memo.concat(line);
		}
	}, []).map(function(line){
		return _.isString(line) ? {
			level: 0,
			name: null,
			text: line
		} : line;
	});
}


// create a signature
function sign(opts) {
	if ('signature' in opts) {
		return opts.signature;
	}
	if ('user' in opts) {
		return sign.def(opts.user);
	}
	return '~~~~';
}

sign.def = function(name) {
	return '-- ' + name;
};

exports.sign = sign;


function lists(text) {
	// unordered list - *
	// ordered list - #
	// definition list - ;:
	var tags = {
		'*': ['ul', 'li'],
		'#': ['ol', 'li'],
		';': ['dl', 'dt'],
		':': ['dl', 'dd'],
		'' : null
	}, prefix = '';

	function wrapArray(val) {
		return _.isArray(val) ? val : [val];
	}

	function down(prefix) {
		return wrapArray(prefix).reverse().map(function(close){
			return '</' + tags[close][1] + '></' + tags[close][0] + '>';
		}).join('');
	}

	function up(prefix) {
		return wrapArray(prefix).map(function(close){
			return '<' + tags[close][0] + '><' + tags[close][1] + '>';
		}).join('');
	}

	function diff(prefix, current) {
		if (prefix[0] == current[0]) {
			return diff(prefix.slice(1), current.slice(1));
		} else {
			return [prefix, current];
		}
	}

	function compare(a, b) {
		return a.slice(0, b.length) == b;
	}

	function crop(a, b) {
		return _.last(a, a.length - b.length);
	}

	function itemTag(symbol) {
		return tags[_.last(symbol)][1];
	}

	return (_.isArray(text) ? text : text.toString().split('\n')).concat('').map(function(line){
		var start = line.match(/^([\*#\:;]*)\s*(.*)$/), ret = line, tmp;
		if (!start) {
			return line;
		}
		if (prefix == start[1]) { // same as last time
			if (prefix) {
				ret = '</' + itemTag(start[1]) + '><' + itemTag(start[1]) + '>' + start[2];
			} else {
				ret = ' ' + start[2]; // no prefix, so just add the line
			}
		} else if (compare(prefix, start[1])) { // going down a level or so
			ret = down(crop(prefix, start[1])) + (tags[_.last(start[1])] ? '</' + itemTag(start[1]) + '><' + itemTag(start[1]) + '>' : '') + start[2];
		} else if (compare(start[1], prefix)) { // going up a level or so
			ret = up(crop(start[1], prefix)) + start[2];
		} else { // down, then up
			tmp = diff(prefix, start[1]);
			ret = (down(tmp[0].split('')) + up(tmp[1].split('')) + start[2]).replace(/<\/dl><dl>/g,''); // so that :; remain in same <dl>
		}
		prefix = start[1];
		return ret;
	});
}
exports.lists = lists;


function monospace(text) { // create <pre> tags
	return (_.isArray(text) ? text : text.toString().split('\n')).concat('').reduce(function(memo, line){
		if (line[0] == ' ' && (_.last(memo) || '')[0] == ' ') {
			return _.initial(memo).concat(_.last(memo) + '\n' + line);
		} else {
			return memo.concat(line);
		}
	}, []).map(function(line){
		if (line[0] == ' ') {
			return html.createTag('pre', {}, line.split('\n').map(function(l){
				return l.slice(1);
			}).join('\n'));
		} else {
			return line;
		}
	});
}
exports.monospace = monospace;


//exports.html = html;
exports.titles = titles;
exports.links = links.exports;