module("Crypto Api");

var crypto_test = {
	user: 'crypto_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 1024
};

asyncTest("Init without keypair", 4, function() {
	// init dependencies
	crypto_test.util = new cryptoLib.Util(window, uuid);
	crypto_test.crypto = new app.crypto.Crypto(window, crypto_test.util);
	ok(crypto_test.crypto, 'Crypto');

	// test without passing keys
	crypto_test.crypto.init({
		emailAddress: crypto_test.user,
		password: crypto_test.password,
		keySize: crypto_test.keySize,
		rsaKeySize: crypto_test.rsaKeySize
	}, function(err, generatedKeypair) {
		ok(!err && generatedKeypair, 'Init crypto without keypair input');
		var pk = generatedKeypair.publicKey;
		ok(pk._id && pk.userId, 'Key ID: ' + pk._id);
		ok(pk.publicKey.indexOf('-----BEGIN PUBLIC KEY-----') === 0, pk.publicKey);
		crypto_test.generatedKeypair = generatedKeypair;

		start();
	});
});

asyncTest("Init with keypair", 1, function() {
	// test with passing keypair
	crypto_test.crypto.init({
		emailAddress: crypto_test.user,
		password: crypto_test.password,
		keySize: crypto_test.keySize,
		rsaKeySize: crypto_test.rsaKeySize,
		storedKeypair: crypto_test.generatedKeypair
	}, function(err, generatedKeypair) {
		ok(!err, 'Init crypto with keypair input');

		start();
	});
});

asyncTest("PBKDF2 (Async/Worker)", 1, function() {
	crypto_test.crypto.deriveKey(crypto_test.password, crypto_test.keySize, function(key) {
		equal(crypto_test.util.base642Str(key).length * 8, crypto_test.keySize, 'Keysize ' + crypto_test.keySize);

		start();
	});
});

asyncTest("AES en/decrypt (Async/Worker)", 2, function() {
	var secret = 'Big secret';

	var key = crypto_test.util.random(crypto_test.keySize);
	var iv = crypto_test.util.random(crypto_test.ivSize);

	crypto_test.crypto.aesEncrypt(secret, key, iv, function(ciphertext) {
		ok(ciphertext, 'Encrypt item');

		crypto_test.crypto.aesDecrypt(ciphertext, key, iv, function(decrypted) {
			equal(decrypted, secret, 'Decrypt item');

			start();
		});
	});
});

asyncTest("AES en/decrypt batch (Async/Worker)", 5, function() {
	// generate test data
	var collection, list, td = new TestData();

	collection = td.getEmailCollection(100);
	list = td.packageCollectionForEncryption(collection, crypto_test.keySize, crypto_test.ivSize);

	crypto_test.crypto.aesEncryptList(list, function(encryptedList) {
		ok(encryptedList, 'Encrypt list');
		equal(encryptedList.length, list.length, 'Length of list');

		crypto_test.crypto.aesDecryptList(encryptedList, function(decryptedList) {
			ok(decryptedList, 'Decrypt list');
			equal(decryptedList.length, list.length, 'Length of list');
			deepEqual(decryptedList, list, 'Decrypted list is correct');

			start();
		});
	});
});

asyncTest("AES/RSA encrypt batch for User (Async/Worker)", 2, function() {
	// generate test data
	var collection, td = new TestData();

	collection = td.getEmailCollection(10);
	crypto_test.list = collection.toJSON();

	var receiverPubkeys = [crypto_test.generatedKeypair.publicKey];

	crypto_test.crypto.encryptListForUser(crypto_test.list, receiverPubkeys, function(err, encryptedList) {
		ok(!err && encryptedList, 'Encrypt list for user');
		equal(encryptedList.length, crypto_test.list.length, 'Length of list');
		crypto_test.encryptedList = encryptedList;

		start();
	});
});

asyncTest("AES/RSA decrypt batch for User (Async/Worker)", 3, function() {

	var senderPubkeys = [crypto_test.generatedKeypair.publicKey];

	crypto_test.crypto.decryptListForUser(crypto_test.encryptedList, senderPubkeys, function(err, decryptedList) {
		ok(!err && decryptedList, 'Decrypt list');
		equal(decryptedList.length, crypto_test.list.length, 'Length of list');
		deepEqual(decryptedList, crypto_test.list, 'Decrypted list is correct');

		start();
	});
});