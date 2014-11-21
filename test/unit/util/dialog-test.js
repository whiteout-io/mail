'use strict';

describe('Dialog Service unit test', function() {
    var dialog,
        opt = {
            foo: 'bar'
        };

    beforeEach(function() {
        angular.module('dialog-test', ['woUtil']);
        angular.mock.module('dialog-test');
        angular.mock.inject(function($injector) {
            dialog = $injector.get('dialog');
        });
    });

    afterEach(function() {});

    describe('info', function() {
        it('should work', inject(function($rootScope) {
            dialog.displayInfo = function() {};
            var displayInfoStub = sinon.stub(dialog, 'displayInfo');

            dialog.info(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            $rootScope.$apply();
            expect(displayInfoStub.withArgs(opt).calledOnce).to.be.true;
        }));
        it('should fail for no display function', inject(function($rootScope) {
            dialog.info(opt).catch(function(err) {
                expect(err.message).to.match(/displayInfo/);
            });

            $rootScope.$apply();
        }));
    });

    describe('error', function() {
        it('should work', inject(function($rootScope) {
            dialog.displayError = function() {};
            var displayErrorStub = sinon.stub(dialog, 'displayError');

            dialog.error(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            $rootScope.$apply();
            expect(displayErrorStub.withArgs(opt).calledOnce).to.be.true;
        }));
        it('should fail for no display function', inject(function($rootScope) {
            dialog.error(opt).catch(function(err) {
                expect(err.message).to.match(/displayError/);
            });

            $rootScope.$apply();
        }));
    });

    describe('confirm', function() {
        it('should work', inject(function($rootScope) {
            dialog.displayConfirm = function() {};
            var displayConfirmStub = sinon.stub(dialog, 'displayConfirm');

            dialog.confirm(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            $rootScope.$apply();
            expect(displayConfirmStub.withArgs(opt).calledOnce).to.be.true;
        }));
        it('should fail for no display function', inject(function($rootScope) {
            dialog.confirm(opt).catch(function(err) {
                expect(err.message).to.match(/displayConfirm/);
            });

            $rootScope.$apply();
        }));
    });

});