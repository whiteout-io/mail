define(['cryptoLib/aes-cbc', 'cryptoLib/util', 'test/test-data'], function(aes, util, testData) {
	'use strict';

	module("AES Crypto");

	var aes_test = {
		keySize: 128,
		test_message: testData.generateBigString(1000)
	};

	test("CBC mode", 4, function() {
		var plaintext = aes_test.test_message;
		var key = util.random(aes_test.keySize);
		var iv = util.random(aes_test.keySize);
		ok(key, 'Key: ' + key);
		equal(util.base642Str(key).length * 8, aes_test.keySize, 'Keysize ' + aes_test.keySize);

		var ciphertext = aes.encrypt(plaintext, key, iv);
		ok(ciphertext, 'Ciphertext lenght: ' + ciphertext.length);

		var decrypted = aes.decrypt(ciphertext, key, iv);
		equal(decrypted, plaintext, 'Decryption correct' + decrypted);
	});
});