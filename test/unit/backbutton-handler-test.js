define(function(require) {
    'use strict';

    var btnHandler = require('js/util/backbutton-handler'),
        expect = chai.expect;

    describe('Backbutton Handler', function() {
        chai.Assertion.includeStack = true;

        var scope, event;

        beforeEach(function() {
            scope = {
                state: {},
                $apply: function() {}
            };

            event = new CustomEvent('backbutton');

            // this is a precondition for the test. throw an exception
            // if this would produce side effects
            expect(navigator.app).to.not.exist;
            navigator.app = {};

            btnHandler.attachHandler(scope);
            btnHandler.start();
        });

        afterEach(function() {
            btnHandler.stop();
            delete navigator.app;
        });

        it('should close lightbox', function() {
            scope.state.lightbox = 'asd';
            document.dispatchEvent(event);
            expect(scope.state.lightbox).to.be.undefined;
        });

        it('should close reader', function() {
            scope.state.read = {
                open: true,
                toggle: function(state) {
                    scope.state.read.open = state;
                }
            };
            document.dispatchEvent(event);
            expect(scope.state.read.open).to.be.false;
        });

        it('should close navigation', function() {
            scope.state.nav = {
                open: true,
                toggle: function(state) {
                    scope.state.nav.open = state;
                }
            };
            document.dispatchEvent(event);
            expect(scope.state.nav.open).to.be.false;
        });

        it('should close app', function(done) {
            navigator.app.exitApp = done;
            document.dispatchEvent(event);
        });
    });
});