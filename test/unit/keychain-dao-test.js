module("Keychain DAO");

var keychaindao_test = {
	user: 'keychaindao_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 512
};

asyncTest("Init", 2, function() {
	// init dependencies
	var util = new cryptoLib.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(Lawnchair);
	var crypto = new app.crypto.Crypto(window, util);
	// cloud storage stub
	var cloudstorageStub = {
		syncPrivateKey: function(emailAdress, storedKey, callback) {
			callback();
		},
		putPublicKey: function(pk, callback) {
			callback();
		}
	};

	keychaindao_test.keychainDao = new app.dao.KeychainDAO(jsonDao, cloudstorageStub);
	ok(keychaindao_test.keychainDao);

	// clear db before test
	jsonDao.clear(function() {
		ok(true, 'cleared db');

		start();
	});
});

asyncTest("Put User Keypair", 1, function() {

	keychaindao_test.keypair = {
		publicKey: {
			_id: '1',
			userId: keychaindao_test.user,
			publicKey: 'asdf'
		},
		privateKey: {
			_id: '1',
			userId: keychaindao_test.user,
			encryptedKey: 'qwer',
			iv: 'yxvc'
		}
	};

	keychaindao_test.keychainDao.putUserKeyPair(keychaindao_test.keypair, function(err) {
		ok(!err);

		start();
	});
});

asyncTest("Get User Keypair", 2, function() {
	keychaindao_test.keychainDao.getUserKeyPair(keychaindao_test.user, function(err, keypair) {
		ok(!err);
		ok(keypair && keypair.publicKey && keypair.privateKey);

		start();
	});
});

asyncTest("Get Public Keys", 2, function() {
	var pubkeyIds = [{
		_id: keychaindao_test.keypair.publicKey._id
	}];
	keychaindao_test.keychainDao.getPublicKeys(pubkeyIds, function(err, pubkeys) {
		ok(!err);
		deepEqual(pubkeys[0], keychaindao_test.keypair.publicKey, "Fetch public key");

		start();
	});
});