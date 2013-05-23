module("Keychain DAO");

var keychaindao_test = {
	user: 'keychaindao_test@example.com',
	password: 'Password',
	keySize: 128,
	ivSize: 128,
	rsaKeySize: 1024
};

asyncTest("Init", 1, function() {
	// init dependencies
	var util = new cryptoLib.Util(window, uuid);
	var jsonDao = new app.dao.LawnchairDAO(window);
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

	start();
});

asyncTest("Get User Keypair", 2, function() {
	keychaindao_test.keychainDao.getUserKeyPair(keychaindao_test.user, function(err, keypair) {
		ok(!err);
		ok(keypair && keypair.publicKey && keypair.privateKey);

		start();
	});
});

// asyncTest("Get Public Keys", 1, function() {

// });