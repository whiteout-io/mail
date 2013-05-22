module("AES Crypto");

var aes_test = {
	keySize: 128,
	util: new cryptoLib.Util(window, uuid),
	test_message: new TestData().generateBigString(1000)
};

test("CBC mode", 4, function() {
	var aes = new cryptoLib.AesCBC(forge);

	var plaintext = aes_test.test_message;
	var key = aes_test.util.random(aes_test.keySize);
	var iv = aes_test.util.random(aes_test.keySize);
	ok(key, 'Key: ' + key);
	equal(aes_test.util.base642Str(key).length * 8, aes_test.keySize, 'Keysize ' + aes_test.keySize);

	var ciphertext = aes.encrypt(plaintext, key, iv);
	ok(ciphertext, 'Ciphertext lenght: ' + ciphertext.length);

	var decrypted = aes.decrypt(ciphertext, key, iv);
	equal(decrypted, plaintext, 'Decryption correct' + decrypted);
});