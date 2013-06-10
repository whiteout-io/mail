define(['cryptoLib/aes-cbc', 'cryptoLib/util', 'test/test-data'], function(aes, util, testData) {
	'use strict';

	module("AES Crypto");

	var aesTest = {
		keySize: 128,
		testMessage: testData.generateBigString(1000)
	};

	test("CBC mode", 4, function() {
		var plaintext = aesTest.testMessage;
		var key = util.random(aesTest.keySize);
		var iv = util.random(aesTest.keySize);
		ok(key, 'Key: ' + key);
		equal(util.base642Str(key).length * 8, aesTest.keySize, 'Keysize ' + aesTest.keySize);

		var ciphertext = aes.encrypt(plaintext, key, iv);
		ok(ciphertext, 'Ciphertext lenght: ' + ciphertext.length);

		var decrypted = aes.decrypt(ciphertext, key, iv);
		equal(decrypted, plaintext, 'Decryption correct' + decrypted);
	});
});