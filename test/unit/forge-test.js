module("Forge Crypto");

var rsa_test = {
	keySize: 1024,
	test_message: '06a9214036b8a15b512e03d534120006'
};

asyncTest("Generate RSA Keypair", 1, function() {

	forge.pki.rsa.generateKeyPair({
		bits: rsa_test.keySize,
		workerScript: app.config.workerPath + '/../lib/forge/prime.worker.js'
	}, function(err, keypair) {
		ok(!err && keypair);
		console.log(keypair);

		rsa_test.keypair = keypair;

		var pkPem = forge.pki.publicKeyToPem(keypair.publicKey);
		var pk = forge.pki.publicKeyFromPem(pkPem);

		start();
	});

});

test("RSA Encrypt", 1, function() {
	rsa_test.ct = rsa_test.keypair.publicKey.encrypt(rsa_test.test_message);
	ok(rsa_test.ct);
});

test("RSA Decrypt", 1, function() {
	var pt = rsa_test.keypair.privateKey.decrypt(rsa_test.ct);
	equal(rsa_test.test_message, pt);
});

test("SHA-256 Hash", 1, function() {
	rsa_test.md = forge.md.sha256.create();
	rsa_test.md.update(rsa_test.ct);
	var digest = rsa_test.md.digest().data;
	ok(digest);
});

test("RSA Sign", 1, function() {
	rsa_test.sig = rsa_test.keypair.privateKey.sign(rsa_test.md);
	ok(rsa_test.sig);
});

test("RSA Verify", 1, function() {
	var res = rsa_test.keypair.publicKey.verify(rsa_test.md.digest().getBytes(), rsa_test.sig);
	ok(res);
});

test("HMAC SHA-256", 1, function() {
	var util = new app.crypto.Util(window, uuid);

	var key = util.base642Str(util.random(forge_aes_test.keySize));
	var iv = util.base642Str(util.random(forge_aes_test.keySize));

	var hmac = forge.hmac.create();
	hmac.start('sha256', key);
	hmac.update(iv);
	hmac.update(rsa_test.test_message);
	var result = hmac.digest().toHex();

	ok(result);
});

test("PBKDF2", 1, function() {
	var util = new app.crypto.Util(window, uuid);

	var salt = util.base642Str("vbhmLjC+Ub6MSbhS6/CkOwxB25wvwRkSLP2DzDtYb+4=");
	var expect = '5223bd44b0523090b21e9d38a749b090';

	var dk = forge.pkcs5.pbkdf2('password', salt, 1000, 16);

	equal(expect, forge.util.bytesToHex(dk));
});

var forge_aes_test = {
	keySize: 128,
	test_message: new TestData().generateBigString(1000)
};

test("AES-128-CBC En/Decrypt", 1, function() {
	var util = new app.crypto.Util(window, uuid);

	var key = util.base642Str(util.random(forge_aes_test.keySize));
	var iv = util.base642Str(util.random(forge_aes_test.keySize));
	var input = forge_aes_test.test_message;

	// encrypt
	var enCipher = forge.aes.createEncryptionCipher(key);
	enCipher.start(iv);
	enCipher.update(forge.util.createBuffer(input));
	enCipher.finish();

	// decrypt
	var deCipher = forge.aes.createDecryptionCipher(key);
	deCipher.start(iv);
	deCipher.update(forge.util.createBuffer(enCipher.output.data));
	deCipher.finish();

	equal(input, deCipher.output, 'En/Decrypt');
});