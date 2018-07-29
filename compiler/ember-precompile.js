#!/usr/bin/env node

var fs = require('fs');
var argv = require('optimist').argv;
var compiler = require(__dirname + "/ember-compiler.js");
var path = require('path');

var usage = '\n  \
Precompile handlebar templates for Ember.js.\n  \
Usage: ' + argv.$0 + ' template...\n\n  \
Options:\n  \
-b, --base-dir Base directory\n \
-f, --output   Output File\n';


function main(){
    if ((argv.h)||(argv.help)) {
        console.log(usage);
        process.exit(0);
    }
    var inputFiles = argv._;
    var outputFile = argv.output || argv.f;
    var baseDir    = argv.b || null;
    var write;

    if (outputFile) {
        fs.writeFileSync(outputFile, '', 'utf8');
        write = function(output){
            fs.appendFileSync(outputFile, output + '\n', 'utf8');
        }
    } else {
        write = console.log;
    }

    var contextFiles = [];
    var finalInputFiles = [];

    inputFiles.forEach(function(fileName) {
        if(fileName.match(/\.js$/i)) {
            contextFiles.push(fileName);
        } else {
            finalInputFiles.push(fileName);
        }
    });

    compiler.compile(contextFiles, finalInputFiles, baseDir).then(function(compiled) {
        if(compiled && compiled.length) {
            compiled.forEach(function(x) {
                if(x.hasOwnProperty(compiler.ItemKeys.CompiledTemplate) && x.hasOwnProperty(compiler.ItemKeys.ProposedTemplateName)) {

                    var template;
                    template = 'Ember.TEMPLATES["' + x[compiler.ItemKeys.ProposedTemplateName] + '"] = Ember.Handlebars.template(' + x[compiler.ItemKeys.CompiledTemplate] + ');' + "\n";
                    write(template);
                }
            });
        }
    }).catch(function(err) {

        if(err) {
            console.error("[Ember-Precompile] failed due to: " + err.toString());
        }
    });
}

main();






