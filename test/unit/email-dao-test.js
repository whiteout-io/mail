module("Email DAO");

var emaildao_test = {
	user: 'test@atlasdev.onmicrosoft.com',
	password: 'Xoza76645',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 1024
};

asyncTest("Init", 3, function() {
	// init dependencies	
	var util = new app.crypto.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
	emaildao_test.crypto = new app.crypto.Crypto(window, util);
	emaildao_test.storage = new app.dao.DeviceStorage(util, emaildao_test.crypto, jsonDao, null);
	// cloud storage stub
	var cloudstorageStub = {
		syncPrivateKey: function(emailAdress, storedKey, callback) {
			callback();
		},
		putPublicKey: function(pk, callback) {
			callback();
		}
	};
	emaildao_test.emailDao = new app.dao.EmailDAO(_, emaildao_test.crypto, emaildao_test.storage, cloudstorageStub, util);

	// generate test data
	emaildao_test.list = new TestData().getEmailCollection(100);

	var account = new app.model.Account({
		emailAddress: emaildao_test.user,
		symKeySize: emaildao_test.keySize,
		symIvSize: emaildao_test.ivSize,
		asymKeySize: emaildao_test.rsaKeySize
	});

	emaildao_test.emailDao.init(account, emaildao_test.password, function(err) {
		ok(!err);
		equal(emaildao_test.emailDao.account.get('emailAddress'), emaildao_test.user, 'Email DAO Account');

		// clear db before tests
		jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});
	});
});

asyncTest("Persist test emails", 3, function() {
	emaildao_test.crypto.encryptListForUser(emaildao_test.list.toJSON(), null, function(err, encryptedList) {
		ok(!err);
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

asyncTest("List Email models", 2, function() {
	emaildao_test.emailDao.listItems('inbox', 0, emaildao_test.list.length, function(err, collection) {
		ok(!err);

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