define(['cryptoLib/rsa'], function(rsa) {
	'use strict';

	module("RSA Crypto");

	var rsaTest = {
		keySize: 1024,
		testMessage: '06a9214036b8a15b512e03d534120006'
	};

	asyncTest("Generate keypair", 1, function() {
		rsa.generateKeypair(rsaTest.keySize, function(err) {
			ok(!err);

			start();
		});
	});

	test("Export keys", 2, function() {
		rsaTest.keypair = rsa.exportKeys();

		ok(rsaTest.keypair.pubkeyPem.indexOf('-----BEGIN PUBLIC KEY-----') === 0, rsaTest.keypair.pubkeyPem);
		ok(rsaTest.keypair.privkeyPem.indexOf('-----BEGIN RSA PRIVATE KEY-----') === 0, rsaTest.keypair.privkeyPem);
	});

	test("Init", 2, function() {
		rsa.init(rsaTest.keypair.pubkeyPem, rsaTest.keypair.privkeyPem);
		var exported = rsa.exportKeys();

		ok(exported.pubkeyPem.indexOf('-----BEGIN PUBLIC KEY-----') === 0);
		ok(exported.privkeyPem.indexOf('-----BEGIN RSA PRIVATE KEY-----') === 0);
	});

	test("Encrypt", 1, function() {
		rsaTest.ct = rsa.encrypt(rsaTest.testMessage);
		ok(rsaTest.ct);
	});

	test("Decrypt", 1, function() {
		var pt = rsa.decrypt(rsaTest.ct);
		equal(pt, rsaTest.testMessage);
	});

	test("Sign", 1, function() {
		rsaTest.sig = rsa.sign([btoa('iv'), btoa(rsaTest.testMessage)]);
		ok(rsaTest.sig);
	});

	test("Verify", 1, function() {
		var res = rsa.verify([btoa('iv'), btoa(rsaTest.testMessage)], rsaTest.sig);
		ok(res);
	});
});