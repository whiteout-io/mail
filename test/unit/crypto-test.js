define(['js/crypto/crypto', 'cryptoLib/util', 'test/test-data'], function(crypto, util, testData) {
	'use strict';

	module("Crypto Api");

	var cryptoTest = {
		user: 'crypto_test@example.com',
		password: 'Password',
		keySize: 128,
		ivSize: 128,
		rsaKeySize: 1024
	};

	asyncTest("Init without keypair", 4, function() {
		// init dependencies
		ok(crypto, 'Crypto');

		// test without passing keys
		crypto.init({
			emailAddress: cryptoTest.user,
			password: cryptoTest.password,
			keySize: cryptoTest.keySize,
			rsaKeySize: cryptoTest.rsaKeySize
		}, function(err, generatedKeypair) {
			ok(!err && generatedKeypair, 'Init crypto without keypair input');
			var pk = generatedKeypair.publicKey;
			ok(pk._id && pk.userId, 'Key ID: ' + pk._id);
			ok(pk.publicKey.indexOf('-----BEGIN PUBLIC KEY-----') === 0, pk.publicKey);
			cryptoTest.generatedKeypair = generatedKeypair;

			start();
		});
	});

	asyncTest("Init with keypair", 1, function() {
		// test with passing keypair
		crypto.init({
			emailAddress: cryptoTest.user,
			password: cryptoTest.password,
			keySize: cryptoTest.keySize,
			rsaKeySize: cryptoTest.rsaKeySize,
			storedKeypair: cryptoTest.generatedKeypair
		}, function(err, generatedKeypair) {
			ok(!err && !generatedKeypair, 'Init crypto with keypair input');

			start();
		});
	});

	asyncTest("PBKDF2 (Async/Worker)", 2, function() {
		crypto.deriveKey(cryptoTest.password, cryptoTest.keySize, function(err, key) {
			ok(!err);
			equal(util.base642Str(key).length * 8, cryptoTest.keySize, 'Keysize ' + cryptoTest.keySize);

			start();
		});
	});

	asyncTest("AES en/decrypt (Async/Worker)", 4, function() {
		var secret = 'Big secret';

		var key = util.random(cryptoTest.keySize);
		var iv = util.random(cryptoTest.ivSize);

		crypto.aesEncrypt(secret, key, iv, function(err, ciphertext) {
			ok(!err);
			ok(ciphertext, 'Encrypt item');

			crypto.aesDecrypt(ciphertext, key, iv, function(err, decrypted) {
				ok(!err);
				equal(decrypted, secret, 'Decrypt item');

				start();
			});
		});
	});

	asyncTest("AES/RSA encrypt batch for User (Async/Worker)", 2, function() {
		// generate test data
		var collection;

		collection = testData.getEmailCollection(10);
		cryptoTest.list = collection.toJSON();

		var receiverPubkeys = [cryptoTest.generatedKeypair.publicKey];

		crypto.encryptListForUser(cryptoTest.list, receiverPubkeys, function(err, encryptedList) {
			ok(!err && encryptedList, 'Encrypt list for user');
			equal(encryptedList.length, cryptoTest.list.length, 'Length of list');
			cryptoTest.encryptedList = encryptedList;

			start();
		});
	});

	asyncTest("AES/RSA decrypt batch for User (Async/Worker)", 3, function() {

		var senderPubkeys = [cryptoTest.generatedKeypair.publicKey];

		crypto.decryptListForUser(cryptoTest.encryptedList, senderPubkeys, function(err, decryptedList) {
			ok(!err && decryptedList, 'Decrypt list');
			equal(decryptedList.length, cryptoTest.list.length, 'Length of list');
			deepEqual(decryptedList, cryptoTest.list, 'Decrypted list is correct');

			start();
		});
	});

});