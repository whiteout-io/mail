module("DeviceStorage");

var devicestorage_test = {
	user: 'devicestorage_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 1024
};

asyncTest("Init", 3, function() {
	// init dependencies
	devicestorage_test.util = new cryptoLib.Util(window, uuid);
	devicestorage_test.jsonDao = new app.dao.LawnchairDAO(window);
	devicestorage_test.crypto = new app.crypto.Crypto(window, devicestorage_test.util);
	devicestorage_test.storage = new app.dao.DeviceStorage(devicestorage_test.util, devicestorage_test.crypto, devicestorage_test.jsonDao, null);
	ok(devicestorage_test.storage, 'DeviceStorageDAO');

	// generate test data
	devicestorage_test.list = new TestData().getEmailCollection(100).toJSON();

	// init crypto
	devicestorage_test.crypto.init({
		emailAddress: devicestorage_test.user,
		password: devicestorage_test.password,
		keySize: devicestorage_test.keySize,
		rsaKeySize: devicestorage_test.rsaKeySize
	}, function(err) {
		ok(!err, 'Init crypto');

		// clear db before tests
		devicestorage_test.jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});

	});
});

asyncTest("Encrypt list for user", 2, function() {
	var receiverPubkeys = [devicestorage_test.crypto.getPublicKey()];

	devicestorage_test.crypto.encryptListForUser(devicestorage_test.list, receiverPubkeys, function(err, encryptedList) {
		ok(!err);
		equal(encryptedList.length, devicestorage_test.list.length, 'Encrypt list');

		devicestorage_test.encryptedList = encryptedList;
		start();
	});
});

asyncTest("Store encrypted list", 1, function() {
	devicestorage_test.storage.storeEcryptedList(devicestorage_test.encryptedList, 'email_inbox', function() {
		ok(true, 'Store encrypted list');

		start();
	});
});

asyncTest("List items", 3, function() {

	var senderPubkeys = [devicestorage_test.crypto.getPublicKey()];

	var offset = 2,
		num = 6;

	// list items from storage (decrypted)
	devicestorage_test.storage.listItems('email_inbox_5', offset, num, senderPubkeys, function(err, decryptedList) {
		ok(!err);
		equal(decryptedList.length, num, 'Found ' + decryptedList.length + ' items in store (and decrypted)');

		var decrypted, orig = devicestorage_test.list[54];

		// check ids
		for (var i = 0; i < decryptedList.length; i++) {
			if (decryptedList[i].id === orig.id && decryptedList[i].from === orig.from) {
				deepEqual(decryptedList[i], orig, 'Messages decrypted correctly');
				break;
			}
		}

		start();
	});
});