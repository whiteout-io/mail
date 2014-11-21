'use strict';

var TCPSocket = require('tcp-socket'),
    ImapClient = require('imap-client'),
    SmtpClient = require('wo-smtpclient'),
    ConnectionDoctor = require('../../../src/js/util/connection-doctor'),
    appConfig = require('../../../src/js/app-config'),
    cfg = appConfig.config;

describe('Connection Doctor', function() {
    var doctor;
    var socketStub, imapStub, smtpStub, credentials, workerPath;

    beforeEach(function() {
        //
        // Stubs
        //

        // there is no socket shim for for this use case, use dummy object
        socketStub = {
            close: function() {
                this.onclose();
            }
        };

        workerPath = '../lib/tcp-socket-tls-worker.min.js';
        imapStub = sinon.createStubInstance(ImapClient);
        smtpStub = sinon.createStubInstance(SmtpClient);

        //
        // Fixture
        //
        credentials = {
            imap: {
                host: 'asd',
                port: 1234,
                secure: true,
                ca: 'cert'
            },
            smtp: {
                host: 'qwe',
                port: 5678,
                secure: false,
                ca: 'cert'
            },
            username: 'username',
            password: 'password'
        };

        sinon.stub(TCPSocket, 'open').returns(socketStub); // convenience constructors suck

        //
        // Setup SUT
        //
        doctor = new ConnectionDoctor(appConfig);
        doctor.configure(credentials);
        doctor._imap = imapStub;
        doctor._smtp = smtpStub;
    });

    afterEach(function() {
        TCPSocket.open.restore();
    });

    describe('#_checkOnline', function() {
        it('should check if browser is online', function(done) {
            doctor._checkOnline(function(error) {
                if (navigator.onLine) {
                    expect(error).to.not.exist;
                } else {
                    expect(error).to.exist;
                    expect(error.code).to.equal(ConnectionDoctor.OFFLINE);
                }
                done();
            });
        });
    });

    describe('#_checkReachable', function() {
        it('should be able to reach the host w/o cert', function(done) {
            credentials.imap.ca = undefined;

            doctor._checkReachable(credentials.imap, function(error) {
                expect(error).to.not.exist;
                expect(TCPSocket.open.calledOnce).to.be.true;
                expect(TCPSocket.open.calledWith(credentials.imap.host, credentials.imap.port, {
                    binaryType: 'arraybuffer',
                    useSecureTransport: credentials.imap.secure,
                    ca: credentials.imap.ca,
                    tlsWorkerPath: workerPath
                })).to.be.true;

                done();
            });

            socketStub.oncert();
            socketStub.onopen();
        });

        it('should catch Mozilla TCPSocket exception', function(done) {
            // Mozilla forbids extensions to the TCPSocket object
            Object.defineProperty(socketStub, 'oncert', {
                set: function() {
                    throw 'Mozilla specific behavior';
                }
            });

            doctor._checkReachable(credentials.imap, function(error) {
                expect(error).to.not.exist;
                expect(TCPSocket.open.calledOnce).to.be.true;
                expect(TCPSocket.open.calledWith(credentials.imap.host, credentials.imap.port, {
                    binaryType: 'arraybuffer',
                    useSecureTransport: credentials.imap.secure,
                    ca: credentials.imap.ca,
                    tlsWorkerPath: workerPath
                })).to.be.true;

                done();
            });

            socketStub.onopen();
        });

        it('should fail w/ wrong cert', function(done) {
            doctor._checkReachable(credentials.imap, function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.TLS_WRONG_CERT);
                expect(TCPSocket.open.calledOnce).to.be.true;
                expect(TCPSocket.open.calledWith(credentials.imap.host, credentials.imap.port, {
                    binaryType: 'arraybuffer',
                    useSecureTransport: credentials.imap.secure,
                    ca: credentials.imap.ca,
                    tlsWorkerPath: workerPath
                })).to.be.true;

                done();
            });

            socketStub.oncert();
            socketStub.onerror();
            socketStub.onclose();
        });

        it('should fail w/ host unreachable', function(done) {
            doctor._checkReachable(credentials.imap, function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.HOST_UNREACHABLE);
                expect(TCPSocket.open.calledOnce).to.be.true;

                done();
            });

            socketStub.onerror({
                data: new Error()
            });
            socketStub.onclose();
        });

        it('should fail w/ timeout', function(done) {
            var origTimeout = cfg.connDocTimeout; // remember timeout from the config to reset it on done
            cfg.connDocTimeout = 20; // set to 20ms for the test

            doctor._checkReachable(credentials.imap, function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.HOST_TIMEOUT);
                expect(TCPSocket.open.calledOnce).to.be.true;
                cfg.connDocTimeout = origTimeout;

                done();
            });
        });
    });

    describe('#_checkImap', function() {
        it('should perform IMAP login, list folders, logout', function(done) {
            imapStub.login.yieldsAsync();
            imapStub.listWellKnownFolders.yieldsAsync(null, {
                Inbox: [{}]
            });
            imapStub.logout.yieldsAsync();

            doctor._checkImap(function(error) {
                expect(error).to.not.exist;
                expect(imapStub.login.calledOnce).to.be.true;
                expect(imapStub.listWellKnownFolders.calledOnce).to.be.true;
                expect(imapStub.logout.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail w/ generic error on logout', function(done) {
            imapStub.login.yieldsAsync();
            imapStub.listWellKnownFolders.yieldsAsync(null, {
                Inbox: [{}]
            });

            doctor._checkImap(function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.GENERIC_ERROR);
                expect(error.underlyingError).to.exist;
                expect(imapStub.login.calledOnce).to.be.true;
                expect(imapStub.listWellKnownFolders.calledOnce).to.be.true;
                expect(imapStub.logout.calledOnce).to.be.true;

                done();
            });

            setTimeout(function() {
                // this error is thrown while we're waiting for the logout
                imapStub.onError(new Error());
            }, 50);
        });

        it('should fail w/ generic error on inbox missing', function(done) {
            imapStub.login.yieldsAsync();
            imapStub.listWellKnownFolders.yieldsAsync(null, {
                Inbox: []
            });

            doctor._checkImap(function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.NO_INBOX);
                expect(imapStub.login.calledOnce).to.be.true;
                expect(imapStub.listWellKnownFolders.calledOnce).to.be.true;
                expect(imapStub.logout.called).to.be.false;

                done();
            });
        });

        it('should fail w/ generic error on listing folders fails', function(done) {
            imapStub.login.yieldsAsync();
            imapStub.listWellKnownFolders.yieldsAsync(new Error());

            doctor._checkImap(function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.GENERIC_ERROR);
                expect(error.underlyingError).to.exist;
                expect(imapStub.login.calledOnce).to.be.true;
                expect(imapStub.listWellKnownFolders.calledOnce).to.be.true;
                expect(imapStub.logout.called).to.be.false;

                done();
            });
        });

        it('should fail w/ auth rejected', function(done) {
            doctor._checkImap(function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.AUTH_REJECTED);
                expect(error.underlyingError).to.exist;
                expect(imapStub.login.calledOnce).to.be.true;
                expect(imapStub.listWellKnownFolders.called).to.be.false;
                expect(imapStub.logout.called).to.be.false;

                done();
            });

            setTimeout(function() {
                // this error is thrown while we're waiting for the login
                imapStub.onError(new Error());
            }, 50);
        });
    });

    describe('#_checkSmtp', function() {
        it('should perform SMTP login, logout', function(done) {
            doctor._checkSmtp(function(error) {
                expect(error).to.not.exist;
                expect(smtpStub.connect.calledOnce).to.be.true;
                expect(smtpStub.quit.calledOnce).to.be.true;

                done();
            });

            smtpStub.onidle();
            smtpStub.onclose();
        });

        it('should fail w/ auth rejected', function(done) {
            doctor._checkSmtp(function(error) {
                expect(error).to.exist;
                expect(error.code).to.equal(ConnectionDoctor.AUTH_REJECTED);
                expect(error.underlyingError).to.exist;
                expect(smtpStub.connect.calledOnce).to.be.true;
                expect(smtpStub.quit.called).to.be.false;

                done();
            });

            smtpStub.onerror(new Error());
        });
    });

    describe('#check', function() {
        beforeEach(function() {
            sinon.stub(doctor, '_checkOnline');
            sinon.stub(doctor, '_checkReachable');
            sinon.stub(doctor, '_checkImap');
            sinon.stub(doctor, '_checkSmtp');
        });

        it('should perform all tests', function(done) {
            doctor._checkOnline.yieldsAsync();
            doctor._checkReachable.withArgs(credentials.imap).yieldsAsync();
            doctor._checkReachable.withArgs(credentials.smtp).yieldsAsync();
            doctor._checkImap.yieldsAsync();
            doctor._checkSmtp.yieldsAsync();

            doctor.check(function(err) {
                expect(err).to.not.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.calledTwice).to.be.true;
                expect(doctor._checkImap.calledOnce).to.be.true;
                expect(doctor._checkSmtp.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail for smtp', function(done) {
            doctor._checkOnline.yieldsAsync();
            doctor._checkReachable.withArgs(credentials.imap).yieldsAsync();
            doctor._checkReachable.withArgs(credentials.smtp).yieldsAsync();
            doctor._checkImap.yieldsAsync();
            doctor._checkSmtp.yieldsAsync(new Error());

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.calledTwice).to.be.true;
                expect(doctor._checkImap.calledOnce).to.be.true;
                expect(doctor._checkSmtp.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail for imap', function(done) {
            doctor._checkOnline.yieldsAsync();
            doctor._checkReachable.withArgs(credentials.imap).yieldsAsync();
            doctor._checkReachable.withArgs(credentials.smtp).yieldsAsync();
            doctor._checkImap.yieldsAsync(new Error());

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.calledTwice).to.be.true;
                expect(doctor._checkImap.calledOnce).to.be.true;
                expect(doctor._checkSmtp.called).to.be.false;

                done();
            });
        });

        it('should fail for smtp reachability', function(done) {
            doctor._checkOnline.yieldsAsync();
            doctor._checkReachable.withArgs(credentials.imap).yieldsAsync();
            doctor._checkReachable.withArgs(credentials.smtp).yieldsAsync(new Error());

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.calledTwice).to.be.true;
                expect(doctor._checkImap.called).to.be.false;
                expect(doctor._checkSmtp.called).to.be.false;

                done();
            });
        });

        it('should fail for imap reachability', function(done) {
            doctor._checkOnline.yieldsAsync();
            doctor._checkReachable.withArgs(credentials.imap).yieldsAsync(new Error());

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.calledOnce).to.be.true;
                expect(doctor._checkImap.called).to.be.false;
                expect(doctor._checkSmtp.called).to.be.false;

                done();
            });
        });

        it('should fail for offline', function(done) {
            doctor._checkOnline.yieldsAsync(new Error());

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.calledOnce).to.be.true;
                expect(doctor._checkReachable.called).to.be.false;
                expect(doctor._checkImap.called).to.be.false;
                expect(doctor._checkSmtp.called).to.be.false;

                done();
            });
        });

        it('should fail w/o config', function(done) {
            doctor.credentials = doctor._imap = doctor._smtp = undefined;

            doctor.check(function(err) {
                expect(err).to.exist;
                expect(doctor._checkOnline.called).to.be.false;
                expect(doctor._checkReachable.called).to.be.false;
                expect(doctor._checkImap.called).to.be.false;
                expect(doctor._checkSmtp.called).to.be.false;

                done();
            });
        });
    });
});