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

# 
# post-build tweaks
# 

echo ""
echo "## Running post-build tweaks"

# cp signing config
echo "Copy Android signing config"
cp ../../../res/android-release-keys.properties .

# status bar should not overlay the web view
echo "Tweaking iOS status bar to not overlay the web view"
sed -i "" 's/StatusBarOverlaysWebView" value="true"/StatusBarOverlaysWebView" value="false"/' "platforms/ios/$PROJNAME/config.xml"

# status bar should use dark font on light background
echo "Tweaking iOS status bar to use dark font on light background"
sed -i "" 's/StatusBarStyle" value="lightcontent"/StatusBarStyle" value="darkcontent"/' "platforms/ios/$PROJNAME/config.xml"

# copy splash screens
echo "Copying splash screens"
cp ../../../src/img/Default* "platforms/ios/$PROJNAME/Resources/splash"

# print reminder for manual work in xcode
echo ""
echo "### Reminder for manual steps required for iOS release"
echo "### Change deployment target to iOS 8.1"
echo "### Use icon set"
echo "### Use correct 60px icon"