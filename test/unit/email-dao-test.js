module("Email DAO");

var emaildao_test = {
	user: 'test@atlasdev.onmicrosoft.com',
	password: 'Xoza76645',
	keySize: 128,
	ivSize: 104
};

asyncTest("Init", 2, function() {
	// init dependencies	
	var util = new app.crypto.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
	emaildao_test.crypto = new app.crypto.Crypto(window, util);
	var naclCrypto = new app.crypto.NaclCrypto(nacl, util);
	emaildao_test.storage = new app.dao.DeviceStorage(util, emaildao_test.crypto, jsonDao, null);
	// cloud storage stub
	var cloudstorageStub = {
		getUserSecretKey: function(emailAdress, callback) {
			callback();
		},
		putPublicKey: function(pk, callback) {
			callback();
		}
	};
	emaildao_test.emailDao = new app.dao.EmailDAO(_, emaildao_test.crypto, emaildao_test.storage, cloudstorageStub, naclCrypto);

	// generate test data
	emaildao_test.list = new TestData().getEmailCollection(100);

	var account = new app.model.Account({
		emailAddress: emaildao_test.user,
		symKeySize: emaildao_test.keySize,
		symIvSize: emaildao_test.ivSize
	});

	emaildao_test.emailDao.init(account, emaildao_test.password, function() {
		equal(emaildao_test.emailDao.account.get('emailAddress'), emaildao_test.user, 'Email DAO Account');

		// clear db before tests
		jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});
	});
});

asyncTest("Persist test emails", 2, function() {
	emaildao_test.crypto.aesEncryptListForUser(emaildao_test.list.toJSON(), function(encryptedList) {
		equal(encryptedList.length, emaildao_test.list.length, 'Encrypt list');

		// add sent date to encrypted items
		for (var i = 0; i < encryptedList.length; i++) {
			encryptedList[i].sentDate = emaildao_test.list.at(i).get('sentDate');
		}

		emaildao_test.storage.storeEcryptedList(encryptedList, 'email_inbox', function() {
			ok(true, 'Store encrypted list');

			start();
		});
	});
});

asyncTest("List Email models", 1, function() {
	emaildao_test.emailDao.listItems('inbox', 0, emaildao_test.list.length, function(collection) {
		var gotten = collection.toJSON(),
			reference = emaildao_test.list.toJSON();

		deepEqual(gotten, reference, 'Compare collection');

		start();
	});
});

asyncTest("Get item", 1, function() {
	var item = emaildao_test.list.toJSON()[0];
	var mail = emaildao_test.emailDao.getItem('inbox', item.id);
	deepEqual(mail.toJSON(), item, 'Item correct');
	start();
});