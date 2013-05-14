module("RSA Crypto");

var rsa_test = {
	keySize: 1024,
	rsa: new app.crypto.RSA(forge),
	test_message: '06a9214036b8a15b512e03d534120006'
};

asyncTest("Generate keypair", 1, function() {
	rsa_test.rsa.generateKeypair(rsa_test.keySize, function(err) {
		ok(!err);

		start();
	});
});

test("Export keys", 2, function() {
	rsa_test.keypair = rsa_test.rsa.exportKeys();

	ok(rsa_test.keypair.pubkeyPem.indexOf('-----BEGIN PUBLIC KEY-----') === 0, rsa_test.keypair.pubkeyPem);
	ok(rsa_test.keypair.privkeyPem.indexOf('-----BEGIN RSA PRIVATE KEY-----') === 0, rsa_test.keypair.privkeyPem);
});

test("Init", 2, function() {
	rsa_test.rsa.init(rsa_test.keypair.pubkeyPem, rsa_test.keypair.privkeyPem);
	var exported = rsa_test.rsa.exportKeys();

	ok(exported.pubkeyPem.indexOf('-----BEGIN PUBLIC KEY-----') === 0);
	ok(exported.privkeyPem.indexOf('-----BEGIN RSA PRIVATE KEY-----') === 0);
});

test("Encrypt", 1, function() {
	rsa_test.ct = rsa_test.rsa.encrypt(rsa_test.test_message);
	ok(rsa_test.ct);
});

test("Decrypt", 1, function() {
	var pt = rsa_test.rsa.decrypt(rsa_test.ct);
	equal(pt, rsa_test.test_message);
});

test("Sign", 1, function() {
	rsa_test.sig = rsa_test.rsa.sign([btoa('iv'), btoa(rsa_test.test_message)]);
	ok(rsa_test.sig);
});

test("Verify", 1, function() {
	var res = rsa_test.rsa.verify([btoa('iv'), btoa(rsa_test.test_message)], rsa_test.sig);
	ok(res);
});