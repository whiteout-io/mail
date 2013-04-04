module("NaCl Crypto");

var nacl_test = {
	keySize: 128
};

test("Init", 1, function() {
	// init dependencies
	nacl_test.util = new app.crypto.Util(window, uuid);
	ok(nacl_test.util, 'Util');
	// generate test data
	nacl_test.test_message = new TestData().generateBigString(1000);
});

test("Generate Keypiar", 1, function() {
	// generate keypair from seed
	var keys = nacl.crypto_box_keypair();
	ok(keys.boxSk && keys.boxPk, "Keysize: " + keys.boxPk.length);
	nacl_test.keys = keys;
});

test("En/Decrypt", 2, function() {
	var naclCrypto = new app.crypto.NaclCrypto();

	var plaintext = nacl_test.test_message;
	// var key = nacl_test.util.random(nacl_test.keySize);
	// var iv = nacl_test.util.random(104);

	// convert utf8 string to Uint8Array 
	var pt = nacl.encode_utf8(plaintext);
	// generate nonce
	var nonce = nacl.crypto_secretbox_random_nonce();
	// encrypt
	var ct = nacl.crypto_secretbox(pt, nonce, nacl_test.keys.boxSk);
	ok(ct, 'Ciphertext length: ' + ct.length);

	// decrypt
	var decryptedBuf = nacl.crypto_secretbox_open(ct, nonce, nacl_test.keys.boxSk);
	var decrypted = nacl.decode_utf8(decryptedBuf);
	equal(decrypted, plaintext, 'Decryption correct: ' + decrypted);

});