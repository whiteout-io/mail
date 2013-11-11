define(function(require) {
    'use strict';

    var expect = chai.expect,
        angular = require('angular'),
        mocks = require('angularMocks'),
        ReadCtrl = require('js/controller/read');

    describe('Read Controller unit test', function() {
        var scope, ctrl;

        beforeEach(function() {
            angular.module('readtest', []);
            mocks.module('readtest');
            mocks.inject(function($rootScope, $controller) {
                scope = $rootScope.$new();
                scope.state = {};
                ctrl = $controller(ReadCtrl, {
                    $scope: scope
                });
            });
        });

        afterEach(function() {});

        describe('scope variables', function() {
            it('should be set correctly', function() {
                expect(scope.state.read).to.exist;
                expect(scope.state.read.open).to.be.false;
                expect(scope.state.read.toggle).to.exist;
            });
        });

        describe('open/close read view', function() {
            it('should open/close', function() {
                expect(scope.state.read.open).to.be.false;
                scope.state.read.toggle(true);
                expect(scope.state.read.open).to.be.true;
                scope.state.read.toggle(false);
                expect(scope.state.read.open).to.be.false;
            });
        });
    });
});