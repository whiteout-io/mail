#!/bin/sh

# go to root
cd `dirname $0`
cd ..

if [ "$#" -ne 3 ] || [ "$1" != "prod" ] && [ "$1" != "test" ] ; then
    echo 'Usage: ./res/aws_release prod|test from-branch 1.0.0'
    exit 0
fi

# switch branch
git checkout $2
git branch -D release/$1
git checkout -b release/$1
git merge $2 --no-edit

# abort if tests fail
set -e

# build and test
rm -rf node_modules/
npm cache clear
npm install
npm test
grunt release-$1 --release=$3

# install only production dependencies
rm -rf node_modules/
npm install --production

# delete .gitignore files before adding to git for aws deployment
find node_modules/ -name ".gitignore" -exec rm -rf {} \;

# Add runtime dependencies to git
sed -i "" '/dist/d' .gitignore
sed -i "" '/node_modules/d' .gitignore
git add .gitignore node_modules/ dist/
git commit -m "Update release"

# push to aws
eb deploy

# switch back to $2 branch
git checkout $2