module("CloudStorage DAO");

var cloudstoragedao_test = {
	user: 'email.dao.it.test@mail.whiteout.io',
	password: 'hellosafe',
	keySize: 128,
	ivSize: 128
};

asyncTest("Init", 1, function() {
	// init dependencies	
	cloudstoragedao_test.util = new app.crypto.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
	var crypto = new app.crypto.Crypto(window, cloudstoragedao_test.util);
	var naclCrypto = new app.crypto.NaclCrypto(nacl, cloudstoragedao_test.util);
	cloudstoragedao_test.storage = new app.dao.DeviceStorage(cloudstoragedao_test.util, crypto, jsonDao, null);
	cloudstoragedao_test.cloudstorage = new app.dao.CloudStorage(window, $);
	cloudstoragedao_test.emailDao = new app.dao.EmailDAO(_, crypto, cloudstoragedao_test.storage, cloudstoragedao_test.cloudstorage, naclCrypto, cloudstoragedao_test.util);

	// clear db before tests
	jsonDao.clear(function(err) {
		ok(!err, 'DB cleared. Error status: ' + err);

		start();
	});
});

asyncTest("Persist public key to cloud", 1, function() {

	// testdata
	cloudstoragedao_test.privateKey = "Bv51afjeuH8CatKo75HOHQRT1B3amvF+DEwijka79nA=";
	cloudstoragedao_test.publicKey = new app.model.PublicKey({
		_id: "da4bfa93-ba87-490e-877c-e4020a6f6729",
		userId: 'integration@atlasdev.onmicrosoft.com',
		publicKey: "yHUhh3Pcbjmh2k367pSXfE8hDwPsAxQs0QETm9mfmz0="
	});

	cloudstoragedao_test.cloudstorage.putPublicKey(cloudstoragedao_test.publicKey.toJSON(), function(err) {
		ok(!err, 'Persist key to cloud');

		start();
	});
});

asyncTest("Get Public key from cloud", 2, function() {
	cloudstoragedao_test.cloudstorage.getPublicKey(cloudstoragedao_test.publicKey.get('_id'), function(err, data) {
		ok(!err && data && data.publicKey, 'Get public key from cloud');
		deepEqual(data, cloudstoragedao_test.publicKey.toJSON(), 'Public key is equal');

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
	cloudstoragedao_test.cloudstorage.putUserSecretKey(cloudstoragedao_test.user, function(err) {
		ok(!err, 'Persist key to cloud');

		start();
	});
});


module("Email DAO");

asyncTest("Init", 1, function() {

	var account = new app.model.Account({
		emailAddress: cloudstoragedao_test.user,
		symKeySize: cloudstoragedao_test.keySize,
		symIvSize: cloudstoragedao_test.ivSize
	});

	cloudstoragedao_test.emailDao.init(account, cloudstoragedao_test.password, function(err) {
		ok(!err, 'Init complete');

		start();
	});
});

asyncTest("Send Plaintext Email item", 1, function() {

	var email = new app.model.Email({
		id: cloudstoragedao_test.util.UUID(),
		from: cloudstoragedao_test.user, // sender address
		to: [cloudstoragedao_test.user], // list of receivers
		subject: 'Client Email DAO Test', // Subject line
		body: 'Hello world' // plaintext body
	});

	cloudstoragedao_test.emailDao.sendEmail(email, function(err) {
		ok(!err, 'Email sent');

		start();
	});
});

asyncTest("Check virtual inbox, re-encrypt and push to cloud", 1, function() {
	cloudstoragedao_test.emailDao.checkVInbox(function(err) {
		ok(!err, 'Synced items');

		start();
	});
});

asyncTest("Sync emails from cloud", 2, function() {
	cloudstoragedao_test.emailDao.syncFromCloud('inbox', function(err) {
		ok(!err, 'Synced items');

		cloudstoragedao_test.emailDao.listItems('inbox', 0, null, function(collection) {
			ok(collection.length > 0, 'Read synced items');

			start();
		});
	});
});