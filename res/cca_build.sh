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

# fixing missing/wrong icons
echo "Fixing wrong/missing iOS icons"
cp ../../../src/img/icon-40-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-40.png"
cp ../../../src/img/icon-80-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-40@2x.png"
cp ../../../src/img/icon-120-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-40@3x.png"
cp ../../../src/img/icon-50-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-50.png"
cp ../../../src/img/icon-100-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-50@2x.png"
cp ../../../src/img/icon-60-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-60.png"
cp ../../../src/img/icon-120-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-60@2x.png"
cp ../../../src/img/icon-180-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-60@3x.png"
cp ../../../src/img/icon-72-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-72.png"
cp ../../../src/img/icon-144-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-72@2x.png"
cp ../../../src/img/icon-76-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-76.png"
cp ../../../src/img/icon-152-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-76@2x.png"
cp ../../../src/img/icon-29-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-small.png"
cp ../../../src/img/icon-58-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-small@2x.png"
cp ../../../src/img/icon-87-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon-small@3x.png"
cp ../../../src/img/icon-57-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon.png"
cp ../../../src/img/icon-114-ios.png "platforms/ios/$PROJNAME/Resources/icons/icon@2x.png"

# print reminder for manual work in xcode
echo ""
echo "### Reminder for manual steps required for iOS release"
echo "### Change deployment target to iOS 8.1"
echo "### Add retina icons to build, migrate to icon set, fix splash screens config"
