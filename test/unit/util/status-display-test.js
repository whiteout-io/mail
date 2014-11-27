'use strict';

describe('Status Display Service unit test', function() {
    var statusDisplay, logInfoStub, rootScope, broadcastSpy;

    beforeEach(function() {
        angular.module('statusDisplay-test', ['woUtil']);
        angular.mock.module('statusDisplay-test');
        angular.mock.inject(function($injector, axe) {
            logInfoStub = sinon.stub(axe, 'info');
            statusDisplay = $injector.get('statusDisplay');
            rootScope = $injector.get('$rootScope');
            broadcastSpy = sinon.spy(rootScope, '$broadcast');
        });
    });

    afterEach(function() {
        logInfoStub.restore();
    });

    describe('update', function() {
        it('should work', function() {
            var message = 'Tada!',
                time = new Date();

            statusDisplay.update(message, time);

            expect(broadcastSpy.withArgs('status', message, time).calledOnce).to.be.true;
            expect(logInfoStub.withArgs('status display', message).calledOnce).to.be.true;
        });
    });

    describe('setSearching', function() {
        it('should work', function() {
            statusDisplay.setSearching(true);

            expect(broadcastSpy.withArgs('searching', true).calledOnce).to.be.true;
        });
    });

});