'use strict';

describe('Status Display Service unit test', function() {
    var statusDisplay, logInfoStub;

    beforeEach(function() {
        angular.module('statusDisplay-test', ['woUtil']);
        angular.mock.module('statusDisplay-test');
        angular.mock.inject(function($injector, axe) {
            logInfoStub = sinon.stub(axe, 'info');
            statusDisplay = $injector.get('statusDisplay');
        });
    });

    afterEach(function() {
        logInfoStub.restore();
    });

    describe('update', function() {
        it('should work', inject(function($rootScope) {
            var message = 'Tada!',
                time = new Date();
            statusDisplay.showStatus = function() {};
            var showStatusStub = sinon.stub(statusDisplay, 'showStatus');

            statusDisplay.update(message, time).then(function(result) {
                expect(result).to.not.exist;
            });

            expect(logInfoStub.calledOnce).to.be.true;
            $rootScope.$apply();
            expect(showStatusStub.withArgs(message, time).calledOnce).to.be.true;
        }));
        it('should fail for no display function', inject(function($rootScope) {
            statusDisplay.update().catch(function(err) {
                expect(err.message).to.match(/showStatus/);
            });

            expect(logInfoStub.calledOnce).to.be.true;
            $rootScope.$apply();
        }));
    });

    describe('setSearching', function() {
        it('should work', inject(function($rootScope) {
            statusDisplay.showSearching = function() {};
            var showSearchingStub = sinon.stub(statusDisplay, 'showSearching');

            statusDisplay.setSearching(true).then(function(result) {
                expect(result).to.not.exist;
            });

            $rootScope.$apply();
            expect(showSearchingStub.withArgs(true).calledOnce).to.be.true;
        }));
        it('should fail for no display function', inject(function($rootScope) {
            statusDisplay.setSearching().catch(function(err) {
                expect(err.message).to.match(/showSearching/);
            });

            $rootScope.$apply();
        }));
    });

});