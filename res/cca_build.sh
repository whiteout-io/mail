#!/bin/sh

# reads values from JSON
jsonValue() {
  KEY=$1
  num=$2
  awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'$KEY'\042/){print $(i+1)}}}' | tr -d '"' | sed -n ${num}p
}

# go to root
cd `dirname $0`
cd ..

DIR=release/cca
PROJNAME=`less dist/manifest.json | jsonValue name 1 | sed -e 's/^ *//' -e 's/ *$//'`

# create
rm -rf $DIR
mkdir -p $DIR
cca create $DIR/Whiteout --link-to=dist/manifest.json

#prepare
cd $DIR/Whiteout
cca prepare

# cp signing config
cp ../../../res/android-release-keys.properties .

# change ios status bar in cordova settings
# status bar should not overlay the web view
sed -i "" 's/StatusBarOverlaysWebView" value="true"/StatusBarOverlaysWebView" value="false"/' "platforms/ios/$PROJNAME/config.xml"
# status bar should use dark font on light background
sed -i "" 's/StatusBarStyle" value="lightcontent"/StatusBarStyle" value="darkcontent"/' "platforms/ios/$PROJNAME/config.xml"

# print reminder for manual work in xcode
echo '### Reminder for manual steps required for iOS release'
echo '### Change deployment target to iOS 8.1'
echo '### Use icon set'
echo '### Use correct 60px icon'