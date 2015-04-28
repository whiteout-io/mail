'use strict';

// use service-worker or app-cache for offline caching
require('./offline-cache');

//
// Angular app config
//

var axe = require('axe-logger');

// include angular modules
require('./app-config');
require('./directive');
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
    'woCrypto',
    'woServices',
    'woEmail',
    'infinite-scroll'
]);

// set router paths
app.config(function($routeProvider, $animateProvider) {
    $routeProvider.when('/login', {
        templateUrl: 'tpl/login.html',
        controller: require('./controller/login/login')
    });
    $routeProvider.when('/add-account', {
        templateUrl: 'tpl/add-account.html',
        controller: require('./controller/login/add-account')
    });
    $routeProvider.when('/create-account', {
        templateUrl: 'tpl/create-account.html',
        controller: require('./controller/login/create-account')
    });
    $routeProvider.when('/validate-phone', {
        templateUrl: 'tpl/validate-phone.html',
        controller: require('./controller/login/validate-phone')
    });
    $routeProvider.when('/login-set-credentials', {
        templateUrl: 'tpl/login-set-credentials.html',
        controller: require('./controller/login/login-set-credentials')
    });
    $routeProvider.when('/login-privatekey-upload', {
        templateUrl: 'tpl/login-privatekey-upload.html',
        controller: require('./controller/login/login-privatekey-upload')
    });
    $routeProvider.when('/login-verify-public-key', {
        templateUrl: 'tpl/login-verify-public-key.html',
        controller: require('./controller/login/login-verify-public-key')
    });
    $routeProvider.when('/login-existing', {
        templateUrl: 'tpl/login-existing.html',
        controller: require('./controller/login/login-existing')
    });
    $routeProvider.when('/login-initial', {
        templateUrl: 'tpl/login-initial.html',
        controller: require('./controller/login/login-initial')
    });
    $routeProvider.when('/login-new-device', {
        templateUrl: 'tpl/login-new-device.html',
        controller: require('./controller/login/login-new-device')
    });
    $routeProvider.when('/login-privatekey-download', {
        templateUrl: 'tpl/login-privatekey-download.html',
        controller: require('./controller/login/login-privatekey-download')
    });
    $routeProvider.when('/account', {
        templateUrl: 'tpl/desktop.html',
        controller: require('./controller/app/navigation'),
        reloadOnSearch: false // don't reload controllers in main app when query params change
    });
    $routeProvider.otherwise({
        redirectTo: '/login'
    });

    // activate ngAnimate for whitelisted classes only
    $animateProvider.classNameFilter(/lightbox/);
});

app.run(function($rootScope) {
    // global state... inherited to all child scopes
    $rootScope.state = {};
    // attach fastclick
    FastClick.attach(document.body);
});

// inject controllers from ng-included view templates
app.controller('ReadCtrl', require('./controller/app/read'));
app.controller('WriteCtrl', require('./controller/app/write'));
app.controller('MailListCtrl', require('./controller/app/mail-list'));
app.controller('AccountCtrl', require('./controller/app/account'));
app.controller('SetPassphraseCtrl', require('./controller/app/set-passphrase'));
app.controller('PublicKeyImportCtrl', require('./controller/app/publickey-import'));
app.controller('ContactsCtrl', require('./controller/app/contacts'));
app.controller('AboutCtrl', require('./controller/app/about'));
app.controller('DialogCtrl', require('./controller/app/dialog'));
app.controller('ActionBarCtrl', require('./controller/app/action-bar'));
app.controller('StatusDisplayCtrl', require('./controller/app/status-display'));

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