module("CloudStorage DAO");

var cloudstoragedao_test = {
	user: 'test@atlasdev.onmicrosoft.com',
	password: 'Xoza76645',
	keySize: 128,
	ivSize: 104
};

asyncTest("Init", 1, function() {
	// init dependencies	
	var util = new app.crypto.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
	cloudstoragedao_test.crypto = new app.crypto.Crypto(window, util);
	cloudstoragedao_test.storage = new app.dao.DeviceStorage(util, cloudstoragedao_test.crypto, jsonDao, null);
	cloudstoragedao_test.cloudstorage = new app.dao.CloudStorage(window, $);
	cloudstoragedao_test.emailDao = new app.dao.EmailDAO(_, cloudstoragedao_test.crypto, cloudstoragedao_test.storage, cloudstoragedao_test.cloudstorage);

	// clear db before tests
	jsonDao.clear(function(err) {
		ok(!err, 'DB cleared. Error status: ' + err);

		start();
	});
});


asyncTest("Get user secret key from cloud", 1, function() {
	cloudstoragedao_test.cloudstorage.getUserSecretKey(cloudstoragedao_test.user, function(err) {
		ok(!err, 'Get/Sync key from cloud');

		start();
	}, function() {
		cloudstoragedao_test.storage.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});
	});
});

asyncTest("Persist user secret key to cloud", 1, function() {
	cloudstoragedao_test.cloudstorage.persistUserSecretKey(cloudstoragedao_test.user, function(err) {
		ok(!err, 'Persist key to cloud');

		start();
	});
});

asyncTest("Sync emails from cloud", 3, function() {

	var account = new app.model.Account({
		emailAddress: cloudstoragedao_test.user,
		symKeySize: cloudstoragedao_test.keySize,
		symIvSize: cloudstoragedao_test.ivSize
	});

	cloudstoragedao_test.emailDao.init(account, cloudstoragedao_test.password, function() {
		ok(true, 'Init complete');

		cloudstoragedao_test.emailDao.syncFromCloud('inbox', function(res) {
			ok(!res, 'Synced items');

			cloudstoragedao_test.emailDao.listItems('inbox', 0, null, function(collection) {
				ok(collection.length > 0, 'Read synced items');

				start();
			});
		});
	});
});