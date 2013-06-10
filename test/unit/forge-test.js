define(['forge', 'cryptoLib/util', 'test/test-data'], function(forge, util, testData) {
	'use strict';

	module("Forge Crypto");

	var forgeRsaTest = {
		keySize: 1024,
		testMessage: '06a9214036b8a15b512e03d534120006'
	};

	var forgeAesTest = {
		keySize: 128,
		testMessage: testData.generateBigString(1000)
	};

	test("SHA-1 Hash", 1, function() {
		var sha1 = forge.md.sha1.create();
		sha1.update(forgeAesTest.testMessage);
		var digest = sha1.digest().toHex();
		ok(digest, digest);
	});

	test("SHA-256 Hash", 1, function() {
		forgeRsaTest.md = forge.md.sha256.create();
		forgeRsaTest.md.update(forgeAesTest.testMessage);
		var digest = forgeRsaTest.md.digest().toHex();
		ok(digest, digest);
	});

	test("HMAC SHA-256", 1, function() {
		var key = util.base642Str(util.random(forgeAesTest.keySize));
		var iv = util.base642Str(util.random(forgeAesTest.keySize));

		var hmac = forge.hmac.create();
		hmac.start('sha256', key);
		hmac.update(iv);
		hmac.update(forgeAesTest.testMessage);
		var digest = hmac.digest().toHex();

		ok(digest, digest);
	});
});