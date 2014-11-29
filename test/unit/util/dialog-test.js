'use strict';

describe('Dialog Service unit test', function() {
    var dialog, logErrorStub, timeout,
        opt = {
            foo: 'bar'
        };

    beforeEach(function() {
        angular.module('dialog-test', ['woUtil']);
        angular.mock.module('dialog-test');
        angular.mock.inject(function($injector, $timeout, axe) {
            logErrorStub = sinon.stub(axe, 'error');
            timeout = $timeout;
            dialog = $injector.get('dialog');
        });
    });

    afterEach(function() {
        logErrorStub.restore();
    });

    describe('info', function() {
        it('should work', function() {
            dialog.displayInfo = function() {};
            var displayInfoStub = sinon.stub(dialog, 'displayInfo');

            dialog.info(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            timeout.flush();
            expect(displayInfoStub.withArgs(opt).calledOnce).to.be.true;
        });
        it('should fail for no display function', function() {
            dialog.info(opt);

            timeout.flush();
            expect(logErrorStub.calledOnce).to.be.true;
        });
    });

    describe('error', function() {
        it('should work', function() {
            dialog.displayError = function() {};
            var displayErrorStub = sinon.stub(dialog, 'displayError');

            dialog.error(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            expect(logErrorStub.calledOnce).to.be.true;
            timeout.flush();
            expect(displayErrorStub.withArgs(opt).calledOnce).to.be.true;
        });
        it('should fail for no display function', function() {
            dialog.error(opt);

            expect(logErrorStub.calledOnce).to.be.true;
            timeout.flush();
            expect(logErrorStub.calledTwice).to.be.true;
        });
    });

    describe('confirm', function() {
        it('should work', function() {
            dialog.displayConfirm = function() {};
            var displayConfirmStub = sinon.stub(dialog, 'displayConfirm');

            dialog.confirm(opt).then(function(result) {
                expect(result).to.not.exist;
            });

            timeout.flush();
            expect(displayConfirmStub.withArgs(opt).calledOnce).to.be.true;
        });
        it('should fail for no display function', function() {
            dialog.confirm(opt);

            timeout.flush();
            expect(logErrorStub.calledOnce).to.be.true;
        });
    });

});