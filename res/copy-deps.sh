#!/bin/sh

echo "--> building dependencies to src\n"

# go to root
cd `dirname $0`
cd ..

# build imap/smtp modules and copy
cd ./node_modules/smtp-client/
node build.js
cd ../../

echo "\n--> finished building dependencies.\n"
