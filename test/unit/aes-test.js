module("AES Crypto");

var aes_test = {
	keySize: 128
};

test("Init", 1, function() {
	// init dependencies
	aes_test.util = new app.crypto.Util(window, uuid);
	ok(aes_test.util, 'Util');
	// generate test data
	aes_test.test_message = new TestData().generateBigString(1000);
});

test("CBC mode", 4, function() {
	var aes = new app.crypto.AesCBC(forge);

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

// test("CCM mode", 2, function() {
// 	var aes = new app.crypto.AesCCM(sjcl);

// 	var plaintext = aes_test.test_message;
// 	var key = aes_test.util.random(aes_test.keySize);
// 	var iv = aes_test.util.random(104);

// 	var ciphertext = aes.encrypt(plaintext, key, iv);
// 	ok(ciphertext, 'Ciphertext length: ' + ciphertext.length);

// 	var decrypted = aes.decrypt(ciphertext, key, iv);
// 	equal(decrypted, plaintext, 'Decryption correct: ' + decrypted);
// });