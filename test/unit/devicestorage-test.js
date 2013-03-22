module("DeviceStorage");

var devicestorage_test = {
	user: 'devicestorage_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 128
};

asyncTest("Init", 3, function() {
	// init dependencies
	devicestorage_test.util = new app.crypto.Util(window, uuid);
	devicestorage_test.jsonDao = new app.dao.LawnchairDAO(window);
	devicestorage_test.crypto = new app.crypto.Crypto(window, devicestorage_test.util);
	devicestorage_test.storage = new app.dao.DeviceStorage(devicestorage_test.util, devicestorage_test.crypto, devicestorage_test.jsonDao, null);
	ok(devicestorage_test.storage, 'DeviceStorageDAO');
	
	// generate test data
	devicestorage_test.list = new TestData().getEmailCollection(100).toJSON();
	
	// init crypto
	devicestorage_test.crypto.init(devicestorage_test.user, devicestorage_test.password, devicestorage_test.keySize, devicestorage_test.ivSize, function() {
		ok(true, 'Crypto initialized');
		
		// clear db before tests
		devicestorage_test.jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);
					
			start();
		});
		
	});
});

asyncTest("Encrypt list for user", 1, function() {
	devicestorage_test.crypto.aesEncryptListForUser(devicestorage_test.list, function(encryptedList) {
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

asyncTest("List items", 2, function() {
	
	var offset = 2,
		num = 6;
	
	// list items from storage (decrypted)
	devicestorage_test.storage.listItems('email_inbox_5',offset ,num, function(decryptedList) {
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