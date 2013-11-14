#!/bin/sh

git checkout $1 && git merge master && git push && git checkout master