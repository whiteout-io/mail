#!/bin/sh

echo "--> copying dependencies to src\n"

# go to root
cd `dirname $0`
cd ..

cp ./node_modules/crypto-lib/src/*.js ./src/js/crypto/