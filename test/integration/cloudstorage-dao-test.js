define(['js/dao/email-dao', 'js/dao/keychain-dao', 'js/dao/lawnchair-dao',
		'js/dao/cloudstorage-dao'
], function(EmailDAO, KeychainDAO, jsonDao, cloudstorage) {
	'use strict';

	module("CloudStorage DAO");

	var cloudstoragedaoTest = {
		user: 'email.dao.it.test@mail.whiteout.io',
		password: 'Xoza76645',
		keySize: 128,
		ivSize: 128,
		rsaKeySize: 1024
	};

	asyncTest("Init", 1, function() {

		// test keys
		var pk = "-----BEGIN PUBLIC KEY-----\r\n" +
			"MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTIupLSuRD5gh6wHx1f4Q2Qv61\r\n" +
			"trOWgqfi/eJUtheoOWkW6KGoLqo5xdklPVIqyP9702PDQtf1upwVB8MCGSiYMDyj\r\n" +
			"Fr0XlYJnJM2ERVrSGkDNSI2+6bVq1k2TB4YeZoMVhel/igCr5Rbr8LyNswCQMIXl\r\n" +
			"oiMEqmiN/YtLwD1z+QIDAQAB\r\n" +
			"-----END PUBLIC KEY-----";
		cloudstoragedaoTest.keypair = {
			publicKey: {
				_id: "01ca6e54-a6b3-4b5f-bb43-ede30aaccc9e",
				userId: cloudstoragedaoTest.user,
				publicKey: pk
			},
			privateKey: {
				_id: "01ca6e54-a6b3-4b5f-bb43-ede30aaccc9e",
				userId: cloudstoragedaoTest.user,
				encryptedKey: "zXBmmR7fz6sfR0AIeOzvwKOb6BrBQBgyweJ4c0LZS9h7C18SgPSMcvpSgBIwJadi577DPmwfXPl6zCNtwoqlLqD6xdS6P/bDY6rIWbaGbRrWzs/KXJ7UjWq0uyZSUFQK8w/woHkyQ4eLqdwj+duPZzrerDyi1XX8XXCcNDpDwR+1L2TxWlDzShN7IiA4OUeFsDbgqN3lKUBSHw5USnassv7nRwWlSNWPVaIlx3YT2T/VIaNoBbX5jDDwhDT4h/1fOOEbxTIBEN65mGGNW9GPLbi/PVgKibrF6l8bHwW5FjIkoYZdzgPe5nowhbFb2FB7mWX4gXMzqT3wuOP9fCOCEj4muxYkV7daedAGFRKl5mTPd9Cu+vSY+SnZX55m1yXQixn55J50AgW+aY/LXV+UqYwVObp7o5qs0B+OhQIRxH2Sp6IjRRFAqsQgBoRXS1qWPLCGVLMoSUkOSOCQd6rsr70fGXxGpguJFigAMWDXAzuPH98UFaB7kCiohhFLZ25vMhd/cOz1MXTKKPQJXfpBr8uX/hhhdsZReVfqLFKpvs1MzdFoV6FiTwZwyDyRnANYRHnqnP148q5s0JOkFcHaHqYdbLvVU6jm/B3QYJ/IO/uKyHoIhVobSSUBLzLDV0Eila9LhCdfWVXIVfFNUr5ut1YyOoJ23G5ItBSq5VFaZv79lNIhWjw/effq1IJd4eKeBe2X2DoYv85FZifAf/kUN38g0rTfAmKedsTGGhMLo+3Aa12MzRF93aTOMyKpHSA0G/5dA5PSVSlgDd/hwn4AlKzfo8M2PF1fh+9q5YtWqs4+mSOmyvYKxg9g+ZBhAvHbVBUN2emoNoJTC6JToB9jeRvksl1iehx+3C8nHUzXsxqApA3a79RJ+izRT2f0GguEAlAz4B6EozFRJwjNyRL2Fe7bgtadJxTNZfcG+oCgCFNCOyOvSgcpkjvj2DlFdPvw5BXXodV5D0jIg+OnszWcgLUDLFMkPPJgYrx9smRqdPjFnjWvnm6bRVZbxaU+FXKFvplmOG3XK1sR9g91bg5nnKDHRf6OuwBBgX0AyzOz2ohO3NVuIcppHjecUEY8t9QgezGal/R1PepW/uNPn/zJgGthTb4rK/KrXZTEsvC3XI55VlSnhORfNJvjn5Up/iusKeKXEGb/lhyc058GZY5UCmoIsV30TYgzXeuj6VZBEtcvAvza0mYmGvXf91ebVZR+",
				iv: "XE4c3X134YNkapbeSXP6GA=="
			}
		};

		// init dependencies
		jsonDao.init(cloudstoragedaoTest.user);
		cloudstoragedaoTest.keychain = new KeychainDAO(cloudstorage);
		cloudstoragedaoTest.emailDao = new EmailDAO(cloudstorage, cloudstoragedaoTest.keychain);

		// clear db before tests
		jsonDao.clear(function(err) {
			ok(!err, 'DB cleared. Error status: ' + err);

			start();
		});
	});

	asyncTest("Put public key to cloud", 1, function() {
		cloudstorage.putPublicKey(cloudstoragedaoTest.keypair.publicKey, function(err) {
			ok(!err, 'Persist key to cloud');

			start();
		});
	});

	asyncTest("Get Public key from cloud by id", 2, function() {
		cloudstorage.getPublicKey(cloudstoragedaoTest.keypair.publicKey._id, function(err, data) {
			ok(!err && data && data.publicKey, 'Get public key from cloud');
			deepEqual(data, cloudstoragedaoTest.keypair.publicKey, 'Public key is equal');

			start();
		});
	});

	asyncTest("Get Public key from cloud by email", 2, function() {
		cloudstorage.getPublicKeyByUserId(cloudstoragedaoTest.keypair.publicKey.userId, function(err, data) {
			ok(!err && data && data.publicKey, 'Get public key from cloud');
			deepEqual(data, cloudstoragedaoTest.keypair.publicKey, 'Public key is equal');

			start();
		});
	});

	asyncTest("Delete Public key from cloud", 1, function() {
		cloudstorage.removePublicKey(cloudstoragedaoTest.keypair.publicKey._id, function(err) {
			ok(!err, 'Delete public key from cloud');

			start();
		});
	});

	asyncTest("Put private key to cloud", 1, function() {
		cloudstorage.putPrivateKey(cloudstoragedaoTest.keypair.privateKey, function(err) {
			ok(!err, 'Persist key to cloud');

			start();
		});
	});

	asyncTest("Get Private key from cloud", 2, function() {
		cloudstorage.getPrivateKey(cloudstoragedaoTest.keypair.privateKey._id, function(err, data) {
			ok(!err && data && data.encryptedKey, 'Get private key from cloud');
			deepEqual(data, cloudstoragedaoTest.keypair.privateKey, 'Private key is equal');

			start();
		});
	});

	asyncTest("Delete Private key from cloud", 1, function() {
		cloudstorage.removePrivateKey(cloudstoragedaoTest.keypair.privateKey._id, function(err) {
			ok(!err, 'Delete private key from cloud');

			start();
		});
	});



	module("Keychain DAO");

	asyncTest("Put User Keypair", 1, function() {
		cloudstoragedaoTest.keychain.putUserKeyPair(cloudstoragedaoTest.keypair, function(err) {
			ok(!err);

			start();
		});
	});

	asyncTest("Get User Keypair", 2, function() {
		cloudstoragedaoTest.keychain.getUserKeyPair(cloudstoragedaoTest.user, function(err, keypair) {
			ok(!err);
			ok(keypair && keypair.publicKey && keypair.privateKey);

			start();
		});
	});

	asyncTest("Get Public Keys", 2, function() {
		var pubkeyIds = [{
				_id: cloudstoragedaoTest.keypair.publicKey._id
			}
		];
		cloudstoragedaoTest.keychain.getPublicKeys(pubkeyIds, function(err, pubkeys) {
			ok(!err);
			deepEqual(pubkeys[0], cloudstoragedaoTest.keypair.publicKey, "Fetch public key");

			start();
		});
	});



	module("Email DAO");

	asyncTest("Init", 1, function() {
		var account = new app.model.Account({
			emailAddress: cloudstoragedaoTest.user,
			symKeySize: cloudstoragedaoTest.keySize,
			symIvSize: cloudstoragedaoTest.ivSize,
			asymKeySize: cloudstoragedaoTest.rsaKeySize
		});

		cloudstoragedaoTest.emailDao.init(account, cloudstoragedaoTest.password, function(err) {
			ok(!err, 'Init complete');

			start();
		});
	});

	asyncTest("Send Plaintext Email item", 1, function() {
		var email = {
			from: cloudstoragedaoTest.user, // sender address
			to: [cloudstoragedaoTest.user], // list of receivers
			subject: 'Client Email DAO Test', // Subject line
			body: 'Hello world' // plaintext body
		};

		cloudstoragedaoTest.emailDao.sendEmail(email, function(err) {
			ok(!err, 'Email sent');

			start();
		});
	});

	asyncTest("Sync emails from cloud", 1, function() {
		cloudstoragedaoTest.emailDao.syncFromCloud('inbox', function(err) {
			ok(!err, 'Synced items');

			start();
		});
	});

	asyncTest("List emails from cloud", 2, function() {

		cloudstoragedaoTest.emailDao.listItems('inbox', 0, null, function(err, gotten) {
			ok(!err);
			ok(gotten.length > 0, 'Read synced items');

			start();
		});
	});

});