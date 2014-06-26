#!/bin/sh

# go to root
cd `dirname $0`
cd ..

DIR=release/cca

rm -rf $DIR
mkdir -p $DIR
cca create $DIR/Whiteout --link-to=dist/manifest.json