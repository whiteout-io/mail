'use strict';

var mocks = angular.mock,
    DialogCtrl = require('../../src/js/controller/dialog');

describe('Dialog Controller unit test', function() {
    var scope, dialogCtrl;

    beforeEach(function() {
        angular.module('dialogtest', []);
        mocks.module('dialogtest');
        mocks.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {
                dialog: {}
            };
            dialogCtrl = $controller(DialogCtrl, {
                $scope: scope
            });
        });
    });

    afterEach(function() {});

    describe('confirm', function() {
        it('should work', function(done) {
            scope.state.dialog.callback = function(confirmed) {
                expect(confirmed).to.be.true;
                expect(scope.state.dialog.open).to.be.false;
                done();
            };
            scope.confirm(true);
        });
    });

    describe('cancel', function() {
        it('should work', function(done) {
            scope.state.dialog.callback = function(confirmed) {
                expect(confirmed).to.be.false;
                expect(scope.state.dialog.open).to.be.false;
                done();
            };
            scope.confirm(false);
        });
    });
});