var EmberCompiler = require("./compiler/ember-compiler"),
    DirectoryLoader = require("./directory-loader"),
    Promise = require("bluebird"),
    async = require("async"),
    fs = require("fs");


function EmberApp(emberCDNVersion) {

    this._templateContexts = [];
    this._templateSources = [];
    this._emberCDNVersion = emberCDNVersion || null;
}

EmberApp.prototype.templateContext = function(context) {
    this._templateContexts.push(context);
};

EmberApp.prototype.templateDirectory = function(location) {
    this._templateSources.push(location);
};

EmberApp.prototype._loadTemplateContext = function() {

    var contextJS = [];
    var self = this;

    return new Promise(function(resolve, reject) {

        async.forEach(self._templateContexts, function(contextPath, done) {

            fs.readFile(contextPath, 'utf8', function(err, js) {
                if(err) {
                    done(err);
                }
                contextJS.push(js);
            });

        }, function(err) {

            if(err) {
                return reject(err);
            }

            return resolve(contextJS);
        });
    });
};


EmberApp.prototype.compileTemplates = function() {

    var emberVersion = this._emberCDNVersion;
    var finalTemplates = [];
    var self = this;

    return self._loadTemplateContext().then(function(contextJS) {

        return new Promise(function(resolve, reject) {

            async.forEach(self._templateSources, function(baseTemplatePath, done) {

                var loader = new DirectoryLoader(baseTemplatePath, true, /\.hbs$/i);
                var templatePaths = [];
                var p;

                p = loader.run(function(itemPath, name, basePath, depth) {
                    templatePaths.push(itemPath);
                    return Promise.resolve();
                });

                p.then(function() {

                    if(templatePaths.length) {

                        EmberCompiler.compile(null, templatePaths, baseTemplatePath, contextJS, emberVersion).then(function(compiledTemplates) {

                            if(compiledTemplates && compiledTemplates.length) {
                                finalTemplates.push.apply(finalTemplates, compiledTemplates);
                            }

                            done();
                        }).catch(function(err) {
                            done(err);
                        });

                    } else {

                        done();
                    }

                }).catch(function(err) {
                    done(err);
                });

            }, function(err) {

                if(err) {
                    return reject(err);
                }

                return resolve(finalTemplates);
            });
        });
    });
};

EmberApp.prototype.compileLoadedTemplates = function(loadedTemplates) {

    var emberVersion = this._emberCDNVersion;
    var toCompile = [];

    for(var k in loadedTemplates) {
        if(loadedTemplates.hasOwnProperty(k) && typeof(loadedTemplates[k]) === "string") {
            toCompile.push({name:k, template:loadedTemplates[k]});
        }
    }

    if(!toCompile.length) {
        return Promise.resolve([]);
    }

    return this._loadTemplateContext().then(function(contextJS) {
        return EmberCompiler.compileLoadedTemplates(null, toCompile, contextJS, emberVersion);
    });
};


EmberApp.prototype.generateClientTemplateLoaderJS = function(compiledTemplates, amdModuleName) {

    var code = "define('" + amdModuleName + "', ['ember'], function(Ember) {" + "\n\n";

    compiledTemplates.forEach(function(t) {

        var template;
        template = '\tEmber.TEMPLATES["' + t[EmberCompiler.ItemKeys.ProposedTemplateName] + '"] = Ember.HTMLBars.template(' + t[EmberCompiler.ItemKeys.CompiledTemplate] + ');' + "\n\n";

        code += template;
    });

    code += "});";

    return Promise.resolve(code);
};

module.exports = EmberApp;