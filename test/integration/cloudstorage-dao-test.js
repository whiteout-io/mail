module("CloudStorage DAO");

var cloudstoragedao_test = {
	user: 'email.dao.it.test@mail.whiteout.io',
	password: 'hellosafe',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 1024
};

asyncTest("Init", 1, function() {
	// init dependencies	
	cloudstoragedao_test.util = new app.crypto.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
	cloudstoragedao_test.crypto = new app.crypto.Crypto(window, cloudstoragedao_test.util);
	cloudstoragedao_test.storage = new app.dao.DeviceStorage(cloudstoragedao_test.util, cloudstoragedao_test.crypto, jsonDao, null);
	cloudstoragedao_test.cloudstorage = new app.dao.CloudStorage(window, $);
	cloudstoragedao_test.emailDao = new app.dao.EmailDAO(_, cloudstoragedao_test.crypto, cloudstoragedao_test.storage, cloudstoragedao_test.cloudstorage, cloudstoragedao_test.util);

	// clear db before tests
	jsonDao.clear(function(err) {
		ok(!err, 'DB cleared. Error status: ' + err);

		start();
	});
});

asyncTest("Persist public key to cloud", 1, function() {

	// testdata
	cloudstoragedao_test.privateKey = "-----BEGIN RSA PRIVATE KEY-----\r\n" +
		"MIICXAIBAAKBgQDK6H7BiPcwiRWnWDuqndw+t+3vIhSmwEEn38kPLenbd+iWb2dX\r\n" +
		"M5y5aBFIgqqHBrcZLwzhMQ10BUTcOgB6Kr3AK7lONKxZ+HD5hX6koj9X5uHtFYF1\r\n" +
		"NYkQv+5WKzHGHRFqoKityZ6AqTxgPss29s6EIOqF/dvvKMiFhgp+4JPsJQIDAQAB\r\n" +
		"AoGAQxIM7C44/zshBDrfJiueJMEpjhUm3GPKZcLMNA9KMPh20lsqvqFZ2dNzexNu\r\n" +
		"CMoIdfOef0V2m/Yt59noVHmSVL7itN4nvbTcD39UQacFiyzT7GRQjeaVAs8ZyeO5\r\n" +
		"2AXtJTNipEyvJ3TbJZCOCML/wOEvCimyHLNCMcoDvkjAbMECQQD81xbRonOZt/7E\r\n" +
		"fBHZQonaTQU/x88l8bXDHvcPfMfg4QkPO+pZ8dBQ4+IpuG60kl4TSmmme4frcJoj\r\n" +
		"jSqd54VVAkEAzXGon2gP+9ZjhbOWESpw+JXiRBytAgailnblFnCJt+o+UoXU8hwH\r\n" +
		"1D5rG2yOIO1vOiqGDQq/Bs61DsfeotvLkQJBAKo6tmZWFba9Jo5raij4n4+Wo54Z\r\n" +
		"jOJjJplEU9rdjEVfvZXAJTyBjlun0jF8tyxkD2q1gwRPz2c43M5q0PKXWjECQCl4\r\n" +
		"UO5khh1yyEIb3yX16Dn1n2faVf37suQmedXOv631RcFIrJR2ngn005AEmKgC5Znb\r\n" +
		"LZYCXk8UeK3UIJfFQFECQGkP1NPyd10Z76LR0lXeL15iP22M/OCaQUIsSi/S+idL\r\n" +
		"YCVcgDpdgVXef0NeNk6w821rlqUjseZyGGKpJ4VNywU=\r\n" +
		"-----END RSA PRIVATE KEY-----";

	var pk = "-----BEGIN PUBLIC KEY-----\r\n" +
		"MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDK6H7BiPcwiRWnWDuqndw+t+3v\r\n" +
		"IhSmwEEn38kPLenbd+iWb2dXM5y5aBFIgqqHBrcZLwzhMQ10BUTcOgB6Kr3AK7lO\r\n" +
		"NKxZ+HD5hX6koj9X5uHtFYF1NYkQv+5WKzHGHRFqoKityZ6AqTxgPss29s6EIOqF\r\n" +
		"/dvvKMiFhgp+4JPsJQIDAQAB\r\n" +
		"-----END PUBLIC KEY-----";

	cloudstoragedao_test.publicKey = new app.model.PublicKey({
		_id: "e91f04a2-a634-42df-a1a4-6a7f1448dbf6",
		userId: 'integration@atlasdev.onmicrosoft.com',
		publicKey: pk
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

asyncTest("Sync private key from cloud", 1, function() {
	cloudstoragedao_test.cloudstorage.syncPrivateKey(cloudstoragedao_test.user, null, function(err) {
		ok(!err, 'Get/Sync key from cloud');

		start();
	}, function(fetchedKey) {
		// replace local key with cloud key
		cloudstoragedao_test.crypto.putEncryptedPrivateKey(fetchedKey);
		// whipe local storage
		cloudstoragedao_test.storage.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});
	});
});

asyncTest("Persist private key to cloud", 1, function() {
	var storedKey = cloudstoragedao_test.crypto.getEncryptedPrivateKey(cloudstoragedao_test.user);

	cloudstoragedao_test.cloudstorage.putPrivateKey(storedKey, function(err) {
		ok(!err, 'Persist key to cloud');

		start();
	});
});


module("Email DAO");

asyncTest("Init", 1, function() {

	var account = new app.model.Account({
		emailAddress: cloudstoragedao_test.user,
		symKeySize: cloudstoragedao_test.keySize,
		symIvSize: cloudstoragedao_test.ivSize,
		asymKeySize: cloudstoragedao_test.rsaKeySize
	});

	cloudstoragedao_test.emailDao.init(account, cloudstoragedao_test.password, function(err) {
		ok(!err, 'Init complete');

		start();
	});
});

// asyncTest("Send Plaintext Email item", 1, function() {

// 	var email = new app.model.Email({
// 		id: cloudstoragedao_test.util.UUID(),
// 		from: cloudstoragedao_test.user, // sender address
// 		to: [cloudstoragedao_test.user], // list of receivers
// 		subject: 'Client Email DAO Test', // Subject line
// 		body: 'Hello world' // plaintext body
// 	});

// 	cloudstoragedao_test.emailDao.sendEmail(email, function(err) {
// 		ok(!err, 'Email sent');

// 		start();
// 	});
// });

// asyncTest("Check virtual inbox, re-encrypt and push to cloud", 1, function() {
// 	cloudstoragedao_test.emailDao.checkVInbox(function(err) {
// 		ok(!err, 'Synced items');

// 		start();
// 	});
// });

// asyncTest("Sync emails from cloud", 2, function() {
// 	cloudstoragedao_test.emailDao.syncFromCloud('inbox', function(err) {
// 		ok(!err, 'Synced items');

// 		cloudstoragedao_test.emailDao.listItems('inbox', 0, null, function(collection) {
// 			ok(collection.length > 0, 'Read synced items');

// 			start();
// 		});
// 	});
// });