'use strict';

var DialogCtrl = require('../../../../src/js/controller/app/dialog');

describe('Dialog Controller unit test', function() {
    var scope, dialogCtrl, dialogService;

    beforeEach(function() {
        angular.module('dialogtest', ['woUtil']);
        angular.mock.module('dialogtest');
        angular.mock.inject(function($rootScope, $controller, dialog) {
            scope = $rootScope.$new();
            scope.state = {
                dialog: {}
            };
            dialogService = dialog;
            dialogCtrl = $controller(DialogCtrl, {
                $scope: scope,
                dialog: dialog
            });
        });
    });

    afterEach(function() {});

    describe('confirm', function() {
        it('should work', function(done) {
            scope.callback = function(confirmed) {
                expect(confirmed).to.be.true;
                expect(scope.state.dialog.open).to.be.false;
                done();
            };
            scope.confirm(true);
        });
    });

    describe('cancel', function() {
        it('should work', function(done) {
            scope.callback = function(confirmed) {
                expect(confirmed).to.be.false;
                expect(scope.state.dialog.open).to.be.false;
                done();
            };
            scope.confirm(false);
        });
    });
});