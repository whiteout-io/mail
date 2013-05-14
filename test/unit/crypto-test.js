module("Crypto Api");

var crypto_test = {
	user: 'crypto_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 104
};

asyncTest("Init", 2, function() {
	// init dependencies
	crypto_test.util = new app.crypto.Util(window, uuid);
	crypto_test.crypto = new app.crypto.Crypto(window, crypto_test.util);
	ok(crypto_test.crypto, 'Crypto');

	crypto_test.crypto.init(crypto_test.user, crypto_test.password, crypto_test.keySize, crypto_test.ivSize, function() {
		ok(true, 'Init crypto');

		start();
	});
});

asyncTest("PBKDF2 (Async/Worker)", 1, function() {
	crypto_test.crypto.deriveKey(crypto_test.password, crypto_test.keySize, function(key) {
		equal(crypto_test.util.base642Str(key).length * 8, crypto_test.keySize, 'Keysize ' + crypto_test.keySize);

		start();
	});
});

asyncTest("En/Decrypt for User", 4, function() {
	var secret = "Secret stuff";

	var itemKey = crypto_test.util.random(crypto_test.keySize);
	var itemIV = crypto_test.util.random(crypto_test.ivSize);
	var keyIV = crypto_test.util.random(crypto_test.ivSize);

	crypto_test.crypto.aesEncrypt(secret, itemKey, itemIV, function(ciphertext) {
		ok(ciphertext, 'Encrypt item');

		crypto_test.crypto.aesEncryptForUser(itemKey, keyIV, function(encryptedKey) {
			ok(encryptedKey, 'Encrypt item key');

			crypto_test.crypto.aesDecryptForUser(encryptedKey, keyIV, function(decryptedKey) {
				equal(decryptedKey, itemKey, 'Decrypt item key');

				crypto_test.crypto.aesDecrypt(ciphertext, decryptedKey, itemIV, function(decrypted) {
					equal(decrypted, secret, 'Decrypt item');

					start();
				});
			});
		});
	});
});

asyncTest("CCM mode (Async/Worker)", 2, function() {
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

asyncTest("CCM batch mode (Async/Worker)", 5, function() {
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

asyncTest("CCM batch mode for User (Async/Worker)", 5, function() {
	// generate test data
	var collection, list, td = new TestData();

	collection = td.getEmailCollection(100);
	list = collection.toJSON();

	crypto_test.crypto.aesEncryptListForUser(list, function(encryptedList) {
		ok(encryptedList, 'Encrypt list for user');
		equal(encryptedList.length, list.length, 'Length of list');

		crypto_test.crypto.aesDecryptListForUser(encryptedList, function(decryptedList) {
			ok(decryptedList, 'Decrypt list');
			equal(decryptedList.length, list.length, 'Length of list');
			deepEqual(decryptedList, list, 'Decrypted list is correct');

			start();
		});
	});
});