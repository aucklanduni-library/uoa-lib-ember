#!/bin/bash
#/usr/local/bin/ember-precompile $1/*.hbs > $2
# $3 is the find and replace js file and is loaded into the current context

#node ember-precompile.js "$3" "$1/"*.hbs
node "${BASH_SOURCE%/*}/compiler/ember-precompile.js" "$1/"*.hbs "$2" > "$3"
