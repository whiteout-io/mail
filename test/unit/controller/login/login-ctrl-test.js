'use strict';

var LoginCtrl = require('../../../../src/js/controller/login/login'),
    Email = require('../../../../src/js/email/email'),
    Account = require('../../../../src/js/email/account'),
    Dialog = require('../../../../src/js/util/dialog'),
    UpdateHandler = require('../../../../src/js/util/update/update-handler'),
    Auth = require('../../../../src/js/service/auth'),
    Keychain = require('../../../../src/js/service/keychain');

describe('Login Controller unit test', function() {
    var scope, location, ctrl,
        emailMock, keychainMock, authMock, accountMock, dialogMock, updateHandlerMock, pathStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        accountMock = sinon.createStubInstance(Account);
        authMock = sinon.createStubInstance(Auth);
        keychainMock = sinon.createStubInstance(Keychain);
        dialogMock = sinon.createStubInstance(Dialog);
        updateHandlerMock = sinon.createStubInstance(UpdateHandler);

        location = {
            path: function() {}
        };
        pathStub = sinon.stub(location, 'path');

        authMock.emailAddress = emailAddress;
    });

    function createController() {
        angular.module('login-test', ['woServices', 'woEmail', 'woUtil']);
        angular.mock.module('login-test');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};
            ctrl = $controller(LoginCtrl, {
                $scope: scope,
                $location: location,
                updateHandler: updateHandlerMock,
                account: accountMock,
                auth: authMock,
                email: emailMock,
                keychain: keychainMock,
                dialog: dialogMock
            });
        });
    }

    afterEach(function() {});

    it('should fail for auth.getEmailAddress', function() {
        authMock.getEmailAddress.yields(new Error());

        createController();

        expect(updateHandlerMock.checkForUpdate.calledOnce).to.be.true;
        expect(authMock.init.calledOnce).to.be.true;
        expect(dialogMock.error.calledOnce).to.be.true;
    });

    it('should redirect to /add-account', function() {
        authMock.getEmailAddress.yields(null, {});

        createController();

        expect(pathStub.withArgs('/add-account').calledOnce).to.be.true;
    });

    it('should fail for auth.init', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(new Error());

        createController();

        expect(accountMock.init.calledOnce).to.be.true;
        expect(dialogMock.error.calledOnce).to.be.true;
    });

    it('should redirect to /login-existing', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        });
        emailMock.unlock.yields(new Error());

        createController();

        expect(pathStub.withArgs('/login-existing').calledOnce).to.be.true;
    });

    it('should fail for auth.storeCredentials', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        });
        emailMock.unlock.yields();
        authMock.storeCredentials.yields(new Error());

        createController();

        expect(dialogMock.error.calledOnce).to.be.true;
    });

    it('should redirect to /desktop', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        });
        emailMock.unlock.yields();
        authMock.storeCredentials.yields();

        createController();

        expect(pathStub.withArgs('/desktop').calledOnce).to.be.true;
    });

    it('should fail for keychain.requestPrivateKeyDownload', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey'
        });
        keychainMock.requestPrivateKeyDownload.yields(new Error());

        createController();

        expect(dialogMock.error.calledOnce).to.be.true;
    });

    it('should redirect to /login-privatekey-download', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey'
        });
        keychainMock.requestPrivateKeyDownload.yields(null, true);

        createController();

        expect(pathStub.withArgs('/login-privatekey-download').calledOnce).to.be.true;
    });

    it('should redirect to /login-new-device', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {
            publicKey: 'publicKey'
        });
        keychainMock.requestPrivateKeyDownload.yields();

        createController();

        expect(pathStub.withArgs('/login-new-device').calledOnce).to.be.true;
    });

    it('should redirect to /login-initial', function() {
        authMock.getEmailAddress.yields(null, {
            emailAddress: emailAddress
        });
        accountMock.init.yields(null, {});

        createController();

        expect(pathStub.withArgs('/login-initial').calledOnce).to.be.true;
    });

});