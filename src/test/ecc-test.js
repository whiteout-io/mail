module("ECC Crypto");

var keys,
	ciphertext,
	plaintext = 'Hello, World!';

test("Generate Keys", function() {
	// generate keypair
	keys = sjcl.ecc.elGamal.generateKeys(384, 1);
	ok(keys);
});

test("Encrypt", function() {
	ciphertext = sjcl.encrypt(keys.pub, plaintext);
	ok(ciphertext);
});

test("Decrypt", function() {
    var decrypted  = sjcl.decrypt(keys.sec, ciphertext);
	equal(plaintext, decrypted);
});