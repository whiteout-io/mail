#!/bin/sh

# go to root
cd `dirname $0`
cd ..

DIR=release/cca

#prepare
cd $DIR/Whiteout
cca build android --release