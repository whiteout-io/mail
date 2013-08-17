#!/bin/sh

echo "--> copying dependencies to src\n"

# go to root
cd `dirname $0`
cd ..

# copy crypto lib
cp ./node_modules/crypto-lib/src/*.js ./src/js/crypto/
cp ./node_modules/crypto-lib/node_modules/node-forge/js/*.js ./src/lib/

# build imap/smtp modules and copy
cd ./node_modules/imap-client/
node build.js && cp ./src-gen/*.js ../../src/lib/
cd ../../

cd ./node_modules/smtp-client/
node build.js && cp ./src-gen/*.js ../../src/lib/
cd ../../

echo "\n--> finished copying dependencies.\n"
