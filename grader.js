#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var Q = require('q');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var CHECKSFILE_DEFAULT = "checks.json";

var str = function(v) {
    if (v) {
        return v.toString();
    } else {
        return v;
    }
};

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var loadHtmlFile = function(filename) {
    var deferred = Q.defer();
    fs.readFile(filename.toString(), function(error, text) {
        if (error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(text);
        }
    });
    return deferred.promise;
};

var loadHtmlUrl = function(url) {
    var deferred = Q.defer();
    rest.get(url.toString()).on('complete', function(result, response){
        if (result instanceof Error) {
            console.log("error accessing url %s: %s", url.toString(), response);
            deferred.reject(result);
        } else {
            deferred.resolve(result);
        }
    });
    return deferred.promise;
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function(html, checksfile) {
    $ = cheerio.load(html);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

if(require.main == module) {
    var html_promise;

    program
        .option('-c, --checks ', 'Path to checks.json', assertFileExists, CHECKSFILE_DEFAULT)
        .option('-f, --file [file]', 'Path to index.html', str, '')
        .option('-u, --url [url]', 'URL path to index.html', str, '')
        .parse(process.argv);
    if (program.file) {
        html_promise = loadHtmlFile(program.file);
    } else if (program.url) {
        html_promise = loadHtmlUrl(program.url);
    } else {
        console.log("Either file or url required. Exiting.");
        process.exit(1);
    }
    html_promise.then(function(html){
        var checkJson = checkHtml(html, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }, function(reason){
        console.log(reason);
    });
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
