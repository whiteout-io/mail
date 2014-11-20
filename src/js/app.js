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

var axe = require('axe-logger'),
    AddAccountCtrl = require('./controller/login/add-account'),
    CreateAccountCtrl = require('./controller/login/create-account'),
    ValidatePhoneCtrl = require('./controller/login/validate-phone'),
    LoginCtrl = require('./controller/login/login'),
    LoginInitialCtrl = require('./controller/login/login-initial'),
    LoginNewDeviceCtrl = require('./controller/login/login-new-device'),
    LoginExistingCtrl = require('./controller/login/login-existing'),
    LoginPrivateKeyDownloadCtrl = require('./controller/login/login-privatekey-download'),
    LoginSetCredentialsCtrl = require('./controller/login/login-set-credentials'),
    DialogCtrl = require('./controller/app/dialog'),
    AccountCtrl = require('./controller/app/account'),
    SetPassphraseCtrl = require('./controller/app/set-passphrase'),
    PrivateKeyUploadCtrl = require('./controller/app/privatekey-upload'),
    ContactsCtrl = require('./controller/app/contacts'),
    AboutCtrl = require('./controller/app/about'),
    MailListCtrl = require('./controller/app/mail-list'),
    ReadCtrl = require('./controller/app/read'),
    WriteCtrl = require('./controller/app/write'),
    NavigationCtrl = require('./controller/app/navigation'),
    ActionBarCtrl = require('./controller/app/action-bar'),
    StatusDisplayCtrl = require('./controller/app/status-display'),
    backButtonUtil = require('./util/backbutton-handler');

// include angular modules
require('./app-config');
require('./directive/common');
require('./util');
require('./crypto');
require('./service');
require('./email');

// init main angular module including dependencies
var app = angular.module('mail', [
    'ngRoute',
    'ngAnimate',
    'ngTagsInput',
    'woAppConfig',
    'woDirectives',
    'woUtil',
    'woCrypto,',
    'woServices',
    'woEmail',
    'navigation',
    'mail-list',
    'write',
    'read',
    'contacts',
    'login-new-device',
    'privatekey-upload',
    'infinite-scroll'
]);

// set router paths
app.config(function($routeProvider, $animateProvider) {
    $routeProvider.when('/login', {
        templateUrl: 'tpl/login.html',
        controller: LoginCtrl
    });
    $routeProvider.when('/add-account', {
        templateUrl: 'tpl/add-account.html',
        controller: AddAccountCtrl
    });
    $routeProvider.when('/create-account', {
        templateUrl: 'tpl/create-account.html',
        controller: CreateAccountCtrl
    });
    $routeProvider.when('/validate-phone', {
        templateUrl: 'tpl/validate-phone.html',
        controller: ValidatePhoneCtrl
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

    // activate ngAnimate for whitelisted classes only
    $animateProvider.classNameFilter(/^lightbox$/);
});

app.run(function($rootScope) {
    // global state... inherited to all child scopes
    $rootScope.state = {};

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
app.controller('ActionBarCtrl', ActionBarCtrl);
app.controller('StatusDisplayCtrl', StatusDisplayCtrl);

//
// Manual angular bootstraping
//

// are we running in a cordova app or in a browser environment?
if (window.cordova) {
    // wait for 'deviceready' event to make sure plugins are loaded
    axe.debug('Assuming Cordova environment...');
    document.addEventListener('deviceready', bootstrap, false);
} else {
    // No need to wait on events... just start the app
    axe.debug('Assuming Browser environment...');
    bootstrap();
}

function bootstrap() {
    angular.element(document).ready(function() {
        angular.bootstrap(document, ['mail']);
    });
}