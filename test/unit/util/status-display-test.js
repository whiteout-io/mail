'use strict';

describe('Status Service unit test', function() {
    var status, logInfoStub, rootScope, broadcastSpy;

    beforeEach(function() {
        angular.module('status-test', ['woUtil']);
        angular.mock.module('status-test');
        angular.mock.inject(function($injector, axe) {
            logInfoStub = sinon.stub(axe, 'info');
            status = $injector.get('status');
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

            status.update(message, time);

            expect(broadcastSpy.withArgs('status', message, time).calledOnce).to.be.true;
            expect(logInfoStub.withArgs('status display', message).calledOnce).to.be.true;
        });
    });

    describe('setSearching', function() {
        it('should work', function() {
            status.setSearching(true);

            expect(broadcastSpy.withArgs('searching', true).calledOnce).to.be.true;
        });
    });

    describe('setReading', function() {
        it('should work', function() {
            status.setReading(true);

            expect(broadcastSpy.withArgs('read', true).calledOnce).to.be.true;
        });
    });

});