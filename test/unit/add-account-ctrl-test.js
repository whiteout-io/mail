define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        AddAccountCtrl = require('js/controller/add-account'),
        Auth = require('js/bo/auth'),
        appController = require('js/app-controller');

    describe('Add Account Controller unit test', function() {
        var scope, location, ctrl, authStub;

        describe('connectToGoogle', function() {
            var origAuth;
            beforeEach(function() {
                // remember original module to restore later, then replace it
                origAuth = appController._auth;
                appController._auth = authStub = sinon.createStubInstance(Auth);
            });

            afterEach(function() {
                // restore the app controller module
                appController._auth = origAuth;
            });

            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                authStub._oauth = {
                    isSupported: function() {
                        return true;
                    }
                };

                authStub.getOAuthToken.yields();

                scope.connectToGoogle();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmail'
                })).to.be.true;
                expect(authStub.getOAuthToken.calledOnce).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });

            it('should not use oauth for gmail', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                authStub._oauth = {
                    isSupported: function() {
                        return false;
                    }
                };

                scope.connectToGoogle();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmail'
                })).to.be.true;
                expect(authStub.getOAuthToken.called).to.be.false;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });

            it('should not forward to login when oauth fails', function(done) {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                authStub._oauth = {
                    isSupported: function() {
                        return true;
                    }
                };

                authStub.getOAuthToken.yields(new Error());

                scope.onError = function(err) {
                    expect(err).to.exist;
                    expect(location.path.called).to.be.false;
                    expect(location.search.called).to.be.false;

                    location.path.restore();
                    location.search.restore();
                    scope.$apply.restore();

                    done();
                };

                scope.connectToGoogle();
            });
        });

        describe('connectToYahoo', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectToYahoo();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'yahoo'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });

        describe('connectToTonline', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectToTonline();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'tonline'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });

        describe('connectToOutlook', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectToOutlook();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'outlook'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });

        describe('connectToGmx', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectToGmx();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'gmx'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });

        describe('connectToWebde', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectToWebde();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'webde'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });

        describe('connectOther', function() {
            it('should forward to login', function() {
                angular.module('addaccounttest', []);
                mocks.module('addaccounttest');
                mocks.inject(function($controller, $rootScope, $location) {
                    location = $location;
                    scope = $rootScope.$new();
                    scope.state = {};

                    sinon.stub(location, 'path').returns(location);
                    sinon.stub(location, 'search').returns(location);
                    sinon.stub(scope, '$apply', function() {});

                    ctrl = $controller(AddAccountCtrl, {
                        $location: location,
                        $scope: scope
                    });
                });

                scope.connectOther();

                expect(location.path.calledWith('/login-set-credentials')).to.be.true;
                expect(location.search.calledWith({
                    provider: 'custom'
                })).to.be.true;

                location.path.restore();
                location.search.restore();
                scope.$apply.restore();
            });
        });
    });
});