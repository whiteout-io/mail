// hey Angular, we're bootstrapping manually!
window.name = 'NG_DEFER_BOOTSTRAP!';

requirejs([
    'angular',
    'js/controller/dialog',
    'js/controller/popover',
    'js/controller/add-account',
    'js/controller/account',
    'js/controller/set-passphrase',
    'js/controller/privatekey-upload',
    'js/controller/contacts',
    'js/controller/about',
    'js/controller/login',
    'js/controller/login-initial',
    'js/controller/login-new-device',
    'js/controller/login-existing',
    'js/controller/login-privatekey-download',
    'js/controller/mail-list',
    'js/controller/read',
    'js/controller/write',
    'js/controller/navigation',
    'js/crypto/util',
    'js/util/error',
    'fastclick',
    'angularRoute',
    'angularAnimate'
], function(
    angular,
    DialogCtrl,
    PopoverCtrl,
    AddAccountCtrl,
    AccountCtrl,
    SetPassphraseCtrl,
    PrivateKeyUploadCtrl,
    ContactsCtrl,
    AboutCtrl,
    LoginCtrl,
    LoginInitialCtrl,
    LoginNewDeviceCtrl,
    LoginExistingCtrl,
    LoginPrivateKeyDownloadCtrl,
    MailListCtrl,
    ReadCtrl,
    WriteCtrl,
    NavigationCtrl,
    util,
    errorUtil,
    FastClick
) {
    'use strict';

    // reset window.name
    window.name = util.UUID();

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
        'popover'
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
    app.controller('PopoverCtrl', PopoverCtrl);

    // manually bootstrap angular due to require.js
    angular.element().ready(function() {
        angular.bootstrap(document, ['mail']);
    });
});