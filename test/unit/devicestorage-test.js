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
	devicestorage_test.jsonDao = new app.dao.LawnchairDAO(Lawnchair);
	devicestorage_test.jsonDao.init(devicestorage_test.user);
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
	}, function(err, generatedKeypair) {
		ok(!err && generatedKeypair, 'Init crypto');
		devicestorage_test.generatedKeypair = generatedKeypair;

		// clear db before tests
		devicestorage_test.jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});

	});
});

asyncTest("Encrypt list for user", 2, function() {
	var receiverPubkeys = [devicestorage_test.generatedKeypair.publicKey];

	devicestorage_test.crypto.encryptListForUser(devicestorage_test.list, receiverPubkeys, function(err, encryptedList) {
		ok(!err);
		equal(encryptedList.length, devicestorage_test.list.length, 'Encrypt list');

		encryptedList.forEach(function(i) {
			i.sentDate = _.findWhere(devicestorage_test.list, {
				id: i.id
			}).sentDate;
		});

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

asyncTest("List items", 4, function() {

	var senderPubkeys = [devicestorage_test.generatedKeypair.publicKey];

	var offset = 2,
		num = 6;

	// list encrypted items from storage
	devicestorage_test.storage.listEncryptedItems('email_inbox', offset, num, function(err, encryptedList) {
		ok(!err);

		// decrypt list
		devicestorage_test.crypto.decryptListForUser(encryptedList, senderPubkeys, function(err, decryptedList) {
			ok(!err);
			equal(decryptedList.length, num, 'Found ' + decryptedList.length + ' items in store (and decrypted)');

			var origSet = devicestorage_test.list.splice(92, num);
			deepEqual(decryptedList, origSet, 'Messages decrypted correctly');

			start();
		});
	});
});