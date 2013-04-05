module("NaCl Crypto");

var nacl_test = {
	keySize: 128
};

test("Init", 1, function() {
	// init dependencies
	var util = new app.crypto.Util(window, uuid);
	ok(util, 'Util');
	// generate test data
	nacl_test.test_message = new TestData().generateBigString(1000);
	nacl_test.crypto = new app.crypto.NaclCrypto(util);
});

// test("Generate Keypair from seed", 2, function() {
// 	// generate keypair from seed
// 	var keys = nacl_test.crypto.generateKeypair();
// 	ok(keys.boxSk && keys.boxPk, "Keypair: " + JSON.stringify(keys));
// });

test("Generate Keypair", 2, function() {
	// generate keypair from seed
	var senderKeypair = nacl_test.crypto.generateKeypair();
	ok(senderKeypair.boxSk && senderKeypair.boxPk, "Sender keypair: " + JSON.stringify(senderKeypair));
	var recipientKeypair = nacl_test.crypto.generateKeypair();
	ok(recipientKeypair.boxSk && recipientKeypair.boxPk, "Receiver keypair: " + JSON.stringify(recipientKeypair));

	nacl_test.senderKeypair = senderKeypair;
	nacl_test.recipientKeypair = recipientKeypair;
});

test("En/Decrypt", 2, function() {
	var plaintext = nacl_test.test_message;

	// encrypt
	var ct = nacl_test.crypto.asymmetricEncrypt(plaintext, nacl_test.recipientKeypair.boxPk, nacl_test.senderKeypair.boxSk);
	ok(ct.ct && ct.nonce, 'Ciphertext length: ' + ct.ct.length);

	// decrypt
	var decrypted = nacl_test.crypto.asymmetricDecrypt(ct.ct, ct.nonce, nacl_test.senderKeypair.boxPk, nacl_test.recipientKeypair.boxSk);
	equal(decrypted, plaintext, 'Decryption correct: ' + decrypted);
});