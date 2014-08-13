#!/bin/sh

# go to root
cd `dirname $0`
cd ..

DIR=release/cca

# create
rm -rf $DIR
mkdir -p $DIR
cca create $DIR/Whiteout --link-to=dist/manifest.json

#prepare
cd $DIR/Whiteout
cca prepare

# cp signing config
cp ../../../res/ant.properties ./platforms/android/