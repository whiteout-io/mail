module("ECC Crypto");

var ecc_test = {
	keySize: 384,
	plaintext: 'Hello, World!'
};

test("Generate Keys", function() {
	// generate keypair
	ecc_test.keys = sjcl.ecc.elGamal.generateKeys(ecc_test.keySize, 0);
	ok(ecc_test.keys);
});

test("Encrypt", function() {
	// var tmp = ecc_test.keys.pub.kem(0);

	// var password = tmp.key.slice(0, ecc_test.keySize / 32);
	// var prp = new sjcl.cipher.ecc(password);


	// var iv = aes_test.util.random(ecc_test.keySize);
	// var ivWords = sjcl.codec.base64.toBits(iv);

	// sjcl.mode.ecc.encrypt(prp, ecc_test.plaintext, ivWords);

	sjcl.random.setDefaultParanoia(0);
	ecc_test.ciphertext = sjcl.encrypt(ecc_test.keys.pub, ecc_test.plaintext);
	ok(ecc_test.ciphertext);
});

test("Decrypt", function() {
	var decrypted = sjcl.decrypt(ecc_test.keys.sec, ecc_test.ciphertext);
	equal(ecc_test.plaintext, decrypted);
});