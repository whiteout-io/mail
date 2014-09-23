'use strict';

// Check if a new ApaCache is available on page load.
if (typeof window.applicationCache !== 'undefined') {
    window.onload = function() {
        window.applicationCache.onupdateready = function() {
            if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
                // Browser downloaded a new app cache
                if (window.confirm('A new version of Whiteout Mail is available. Restart the app to update?')) {
                    window.location.reload();
                }
            }
        };
    };
}

var DialogCtrl = require('./controller/dialog'),
    AddAccountCtrl = require('./controller/add-account'),
    AccountCtrl = require('./controller/account'),
    SetPassphraseCtrl = require('./controller/set-passphrase'),
    PrivateKeyUploadCtrl = require('./controller/privatekey-upload'),
    ContactsCtrl = require('./controller/contacts'),
    AboutCtrl = require('./controller/about'),
    LoginCtrl = require('./controller/login'),
    LoginInitialCtrl = require('./controller/login-initial'),
    LoginNewDeviceCtrl = require('./controller/login-new-device'),
    LoginExistingCtrl = require('./controller/login-existing'),
    LoginPrivateKeyDownloadCtrl = require('./controller/login-privatekey-download'),
    LoginSetCredentialsCtrl = require('./controller/login-set-credentials'),
    MailListCtrl = require('./controller/mail-list'),
    ReadCtrl = require('./controller/read'),
    WriteCtrl = require('./controller/write'),
    NavigationCtrl = require('./controller/navigation'),
    errorUtil = require('./util/error'),
    backButtonUtil = require('./util/backbutton-handler');
require('./directives/common');

// init main angular module including dependencies
var app = angular.module('mail', [
    'ngRoute',
    'ngAnimate',
    'navigation',
    'mail-list',
    'write',
    'read',
    'contacts',
    'login-new-device',
    'privatekey-upload',
    'infinite-scroll',
    'ngTagsInput',
    'woDirectives'
]);

// set router paths
app.config(function($routeProvider) {
    $routeProvider.when('/add-account', {
        templateUrl: 'tpl/add-account.html',
        controller: AddAccountCtrl
    });
    $routeProvider.when('/login', {
        templateUrl: 'tpl/login.html',
        controller: LoginCtrl
    });
    $routeProvider.when('/login-set-credentials', {
        templateUrl: 'tpl/login-set-credentials.html',
        controller: LoginSetCredentialsCtrl
    });
    $routeProvider.when('/login-existing', {
        templateUrl: 'tpl/login-existing.html',
        controller: LoginExistingCtrl
    });
    $routeProvider.when('/login-initial', {
        templateUrl: 'tpl/login-initial.html',
        controller: LoginInitialCtrl
    });
    $routeProvider.when('/login-new-device', {
        templateUrl: 'tpl/login-new-device.html',
        controller: LoginNewDeviceCtrl
    });
    $routeProvider.when('/login-privatekey-download', {
        templateUrl: 'tpl/login-privatekey-download.html',
        controller: LoginPrivateKeyDownloadCtrl
    });
    $routeProvider.when('/desktop', {
        templateUrl: 'tpl/desktop.html',
        controller: NavigationCtrl
    });
    $routeProvider.otherwise({
        redirectTo: '/login'
    });
});

app.run(function($rootScope) {
    // global state... inherited to all child scopes
    $rootScope.state = {};

    // attach global error handler
    errorUtil.attachHandler($rootScope);

    // attach the back button handler to the root scope
    backButtonUtil.attachHandler($rootScope);

    // attach fastclick
    FastClick.attach(document.body);
});

// inject controllers from ng-included view templates
app.controller('ReadCtrl', ReadCtrl);
app.controller('WriteCtrl', WriteCtrl);
app.controller('MailListCtrl', MailListCtrl);
app.controller('AccountCtrl', AccountCtrl);
app.controller('SetPassphraseCtrl', SetPassphraseCtrl);
app.controller('PrivateKeyUploadCtrl', PrivateKeyUploadCtrl);
app.controller('ContactsCtrl', ContactsCtrl);
app.controller('AboutCtrl', AboutCtrl);
app.controller('DialogCtrl', DialogCtrl);