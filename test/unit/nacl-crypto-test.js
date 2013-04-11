module("NaCl Crypto");

var nacl_test = {
	keySize: 128,
	nonceSize: 192
};

test("Init", 1, function() {
	// init dependencies
	nacl_test.util = new app.crypto.Util(window, uuid);
	ok(nacl_test.util, 'Util');
	// generate test data
	nacl_test.test_message = new TestData().generateBigString(1000);
	nacl_test.crypto = new app.crypto.NaclCrypto(nacl, nacl_test.util);
});

test("Generate Keypair from seed", 1, function() {
	// generate keypair from seed
	var seed = nacl_test.util.random(128);
	var keys = nacl_test.crypto.generateKeypair(seed);
	ok(keys.boxSk && keys.boxPk && keys.id, "Keypair: " + JSON.stringify(keys));
});

test("Generate Keypair", 2, function() {
	// generate keypair
	var senderKeypair = nacl_test.crypto.generateKeypair();
	ok(senderKeypair.boxSk && senderKeypair.boxPk, "Sender keypair: " + JSON.stringify(senderKeypair));
	var recipientKeypair = nacl_test.crypto.generateKeypair();
	ok(recipientKeypair.boxSk && recipientKeypair.boxPk, "Receiver keypair: " + JSON.stringify(recipientKeypair));

	nacl_test.senderKeypair = senderKeypair;
	nacl_test.recipientKeypair = recipientKeypair;
});

test("Asymmetric En/Decrypt", 3, function() {
	var plaintext = nacl_test.test_message;

	var nonce = nacl_test.crypto.generateNonce();
	ok(nonce, 'Nonce: ' + nonce);
	// encrypt
	var ct = nacl_test.crypto.asymEncrypt(plaintext, nonce, nacl_test.recipientKeypair.boxPk, nacl_test.senderKeypair.boxSk);
	ok(ct, 'Ciphertext length: ' + ct.length);

	// decrypt
	var decrypted = nacl_test.crypto.asymDecrypt(ct, nonce, nacl_test.senderKeypair.boxPk, nacl_test.recipientKeypair.boxSk);
	equal(decrypted, plaintext, 'Decryption correct: ' + decrypted);
});

test("Symmetric En/Decrypt", 3, function() {
	var plaintext = nacl_test.test_message;

	var nonce = nacl_test.crypto.generateNonce();
	ok(nonce, 'Nonce: ' + nonce);
	// encrypt
	var ct = nacl_test.crypto.symEncrypt(plaintext, nonce, nacl_test.senderKeypair.boxSk);
	ok(ct, 'Ciphertext length: ' + ct.length);

	// decrypt
	var decrypted = nacl_test.crypto.symDecrypt(ct, nonce, nacl_test.senderKeypair.boxSk);
	equal(decrypted, plaintext, 'Decryption correct: ' + decrypted);
});

asyncTest("Asymmetric En/Decrypt (WebWorker)", 3, function() {
	var plaintext = nacl.encode_utf8(nacl_test.test_message),
		nonce = nacl.crypto_secretbox_random_nonce(),
		utl = nacl_test.util,
		recipientPk = utl.binStr2Uint8Arr(utl.base642Str(nacl_test.recipientKeypair.boxPk)),
		senderSk = utl.binStr2Uint8Arr(utl.base642Str(nacl_test.senderKeypair.boxSk)),
		recipienSk = utl.binStr2Uint8Arr(utl.base642Str(nacl_test.recipientKeypair.boxSk)),
		senderPk = utl.binStr2Uint8Arr(utl.base642Str(nacl_test.senderKeypair.boxPk));

	// encrypt

	function encrypt(pt) {
		var encryptWorker = new Worker(app.config.workerPath + '/crypto/nacl-worker.js');
		encryptWorker.onmessage = function(e) {
			ok(e.data, 'Encryption');
			decrypt(e.data);
		};
		encryptWorker.postMessage({
			type: 'encrypt',
			plaintext: pt,
			nonce: nonce,
			recipientPk: recipientPk,
			senderSk: senderSk
		});
	}

	// decrypt

	function decrypt(ct) {
		var decryptWorker = new Worker(app.config.workerPath + '/crypto/nacl-worker.js');
		decryptWorker.onmessage = function(e) {
			ok(e.data, 'Decryption');
			deepEqual(e.data, plaintext, 'Decrypted = Plaintext');
			start();
		};
		decryptWorker.postMessage({
			type: 'decrypt',
			ciphertext: ct,
			nonce: nonce,
			senderPk: senderPk,
			recipienSk: recipienSk
		});
	}

	encrypt(plaintext);
});