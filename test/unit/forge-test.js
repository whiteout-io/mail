define(['forge', 'cryptoLib/util', 'test/test-data'], function(forge, util, testData) {
	'use strict';

	module("Forge Crypto");

	var forge_rsa_test = {
		keySize: 1024,
		test_message: '06a9214036b8a15b512e03d534120006'
	};

	var forge_aes_test = {
		keySize: 128,
		test_message: testData.generateBigString(1000)
	};

	test("SHA-1 Hash", 1, function() {
		var sha1 = forge.md.sha1.create();
		sha1.update(forge_aes_test.test_message);
		var digest = sha1.digest().toHex();
		ok(digest, digest);
	});

	test("SHA-256 Hash", 1, function() {
		forge_rsa_test.md = forge.md.sha256.create();
		forge_rsa_test.md.update(forge_aes_test.test_message);
		var digest = forge_rsa_test.md.digest().toHex();
		ok(digest, digest);
	});

	test("HMAC SHA-256", 1, function() {
		var key = util.base642Str(util.random(forge_aes_test.keySize));
		var iv = util.base642Str(util.random(forge_aes_test.keySize));

		var hmac = forge.hmac.create();
		hmac.start('sha256', key);
		hmac.update(iv);
		hmac.update(forge_aes_test.test_message);
		var digest = hmac.digest().toHex();

		ok(digest, digest);
	});
});