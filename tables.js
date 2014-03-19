// Wiki tables

var _      = require('underscore'),
    html   = require('./html');

exports.samples = [
    "{| cellpadding=\"2\" style=\"border: 1px solid darkgray;\"\n" +
    "! width=\"140\" | Left\n" +
    "! width=\"150\" | Middle\n" +
    "! width=\"130\" | Right\n" +
    "|- border=\"0\"\n" +
    "| [[File:StarIconBronze.png|120px]]\n" +
    "| [[File:StarIconGold.png|120px|Caption when mouse-over image]]\n" +
    "| [[File:StarIconGreen.png|120px|Green stellar icon]]\n" +
    "|- align=\"center\"\n" +
    "| Bronze star || Gold star || Green star\n" +
    "|}",

    "{| cellpadding=\"3\"\n" + 
    "|-\n" +
    "! width=\"47%\" | [[Semicolon Glitch]]\n" +
    "! width=\"5%\" |\n" +
    "! width=\"47%\" | [[Scratch Holiday Logo]]\n" +
    "|-\n" +
    "| [[File:Semicolon.png|175px]]\n" +
    "|\n" +
    "| [[File:Scratch Holiday Logo (Christmas 2009).png|175px]]\n" +
    "|-\n" +
    "| ''The semicolon in the bottom left corner of the Scratch Website.''\n" +
    "|\n" +
    "| ''The logo used on the [[Front Page]] for Christmas 2009.''\n" +
    "|}",

    "{|\n" +
    "|-\n" +
    "! 1 !! 2 !! 3\n" +
    "|-\n" +
    "| a || b || c\n" +
    "|}"
];

exports.preParse = function(text){
    return _.flatten(text.split('{|').map(function(table){
        return table.match(/\|\}/) ? table.split('|}').map(function(part, i){
            if (i % 2) { // outside of table, e.g. 1
                return part;
            }
            part = _.compact(part.split('\n'));
            if (!part[1].match(/^\|\-/)) { // add in a starting row marker if missing
                part.splice(1, 0, '|-');
            }
            return part.join('\n').split('|-').map(function(row, i){
                row = row.trim();
                if (i == 0 && row[0] != '|' && row[0] != '!') { // format info at the beginning
                    return row;
                }
                return _.flatten(row.split('\n').map(function(col){
                    return col.replace(/\|\||\!\!/g, function(sep){ // transform || syntax to \n|
                        return '\n' + sep[0];
                    }).split('\n');
                }));
            });
        }) : table;
    }), true);
};