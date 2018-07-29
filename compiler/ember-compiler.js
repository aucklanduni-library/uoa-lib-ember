var CDNProvider = require("@uoalib/uoa-lib-cdn"),
    CDNVersions = require("./../cdn-versions"),
    Promise = require("bluebird"),
    async = require('async'),
    vm = require('vm'),
    path = require('path'),
    fs = require('fs');

exports.ItemKeys = {
    CompiledTemplate: "compiled-template",
    FileName: "file-name",
    FilePath: "file-path",
    ProposedTemplateName: "proposed-template-name"
};

var DefaultEmberCompiler = null;

function _loadSpecificEmberTemplateCompiler(version) {
    var emberJSPath = CDNProvider.localModuleJSDirectoryPath(version);
    return emberJSPath ? require(path.join(emberJSPath, "ember-template-compiler.js")) : null;
}

DefaultEmberCompiler = _loadSpecificEmberTemplateCompiler(CDNVersions.EmberCDNVersion);


var resolvePath = function(resolverContext, path) {
    var parts = path.split(".");
    var cntxt = resolverContext;
    if(!cntxt) {
        return undefined;
    }

    for(var i = 0, ii=parts.length; i < ii; i++) {
        if(cntxt.hasOwnProperty(parts[i])) {
            cntxt = cntxt[parts[i]];
        } else {
            cntxt = undefined;
            break;
        }
    }
    return cntxt;
};

function _resolveReferencedVariables(resolverContext, string) {

    return string.replace(/__[\w\.]+__/gi, function(r) {
        var p = r.replace(/^__/, "").replace(/__$/, "");
        var rr="";
        p = p.split("__.__");
        p.forEach(function(x) {
            if(rr !== null) {
                var v = resolvePath(resolverContext, x);
                if(v) {
                    rr += ((rr.length > 0) ? "." : "") + v.toString();
                } else {
                    rr = null;
                }
            }
        });
        if(!rr || rr.length === 0) {
            console.warn("Ember Compiler: unable to resolve reference [" + r + "]");
        }
        return ((rr && rr.length > 0) ? rr : r);
    });
}

exports.compile = function(contextFiles, templateFiles, baseDir, contextLoadedContent, emberCDNVersion) {

    var EmberCompiler = DefaultEmberCompiler;
    if(emberCDNVersion) {
        EmberCompiler = _loadSpecificEmberTemplateCompiler(emberCDNVersion);
    }

    var findReplaceContext = vm.createContext({});
    var doesHaveSRContext = false;

    if(contextFiles && contextFiles.length) {
        contextFiles.forEach(function(cf) {
            var js = fs.readFileSync(cf, 'utf8');
            if(js) {
                vm.runInContext(js, findReplaceContext);
                doesHaveSRContext = true;
            }
        });
    }

    if(contextLoadedContent && contextLoadedContent.length) {
        contextLoadedContent.forEach(function(js) {
            vm.runInContext(js, findReplaceContext);
            doesHaveSRContext = true;
        });
    }

    return new Promise(function(resolve, reject) {

        var compiledItems = [];

        async.forEach(templateFiles, function(fileName, done) {

            var fileBaseDir = baseDir || (path.dirname(fileName) + "/");

            fs.readFile(fileName, 'utf8', function(err, template) {
                if(err) {
                    done(err);
                    return;
                }

                if(doesHaveSRContext) {
                    template = _resolveReferencedVariables(findReplaceContext, template);
                }

                try {
                    template = EmberCompiler.precompile(template, false);
                } catch(e) {
                    done(e);
                    return;
                }

                var item = {};

                item[exports.ItemKeys.CompiledTemplate] = template;
                item[exports.ItemKeys.FilePath] = fileName;

                fileName = path.relative(fileBaseDir, fileName);

                item[exports.ItemKeys.FileName] = fileName;
                item[exports.ItemKeys.ProposedTemplateName] = fileName.replace(/\.(handlebars|hbs)$/, '').replace(/\./g, '/');

                compiledItems.push(item);
                done();
            });

        }, function(err) {
            if(err) {
                return reject(err);
            }
            return resolve(compiledItems);
        });
    });
};


exports.compileLoadedTemplates = function(contextFiles, templates, contextLoadedContent, emberCDNVersion) {

    var EmberCompiler = DefaultEmberCompiler;
    if(emberCDNVersion) {
        EmberCompiler = _loadSpecificEmberTemplateCompiler(emberCDNVersion);
    }

    var findReplaceContext = vm.createContext({});
    var doesHaveSRContext = false;

    if(contextFiles && contextFiles.length) {
        contextFiles.forEach(function(cf) {
            var js = fs.readFileSync(cf, 'utf8');
            if(js) {
                vm.runInContext(js, findReplaceContext);
                doesHaveSRContext = true;
            }
        });
    }

    if(contextLoadedContent && contextLoadedContent.length) {
        contextLoadedContent.forEach(function(js) {
            vm.runInContext(js, findReplaceContext);
            doesHaveSRContext = true;
        });
    }

    return new Promise(function(resolve, reject) {

        var compiledItems = [];

        async.forEach(templates, function(t, done) {

            var template = t.template;

            if(doesHaveSRContext) {
                template = _resolveReferencedVariables(findReplaceContext, template);
            }

            try {
                template = EmberCompiler.precompile(template, false);
            } catch(e) {
                done(e);
                return;
            }

            var item = {};
            item[exports.ItemKeys.CompiledTemplate] = template;
            item[exports.ItemKeys.FilePath] = null;
            item[exports.ItemKeys.FileName] = null;
            item[exports.ItemKeys.ProposedTemplateName] = t.name;

            compiledItems.push(item);
            done();

        }, function(err) {

            if(err) {
                return reject(err);
            }
            return resolve(compiledItems);
        });

    });
};