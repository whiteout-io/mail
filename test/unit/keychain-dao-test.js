define(['js/dao/keychain-dao', 'js/dao/lawnchair-dao'], function(KeychainDAO, jsonDao) {
	'use strict';

	module("Keychain DAO");

	var keychaindaoTest = {
		user: 'keychaindao_test@example.com',
		password: 'Password',
		keySize: 128,
		ivSize: 128,
		rsaKeySize: 512
	};

	asyncTest("Init", 2, function() {

		// stubbing
		var cloudstorageStub = {
			putPublicKey: function(pk, callback) {
				callback();
			},
			putPrivateKey: function(prk, callback) {
				callback();
			}
		};

		// module instancing
		keychaindaoTest.keychainDao = new KeychainDAO(cloudstorageStub);
		ok(keychaindaoTest.keychainDao);

		// init and clear db before test
		jsonDao.init(keychaindaoTest.user, function() {
			jsonDao.clear(function() {
				ok(true, 'cleared db');

				start();
			});
		});
	});

	asyncTest("Put User Keypair", 1, function() {

		keychaindaoTest.keypair = {
			publicKey: {
				_id: '123',
				userId: keychaindaoTest.user,
				publicKey: 'asdf'
			},
			privateKey: {
				_id: '123',
				userId: keychaindaoTest.user,
				encryptedKey: 'qwer',
				iv: 'yxvc'
			}
		};

		keychaindaoTest.keychainDao.putUserKeyPair(keychaindaoTest.keypair, function(err) {
			ok(!err);

			start();
		});
	});

	asyncTest("Get User Keypair", 2, function() {
		keychaindaoTest.keychainDao.getUserKeyPair(keychaindaoTest.user, function(err, keypair) {
			ok(!err);
			ok(keypair && keypair.publicKey && keypair.privateKey);

			start();
		});
	});

	asyncTest("Get Public Keys", 2, function() {
		var pubkeyIds = [{
			_id: keychaindaoTest.keypair.publicKey._id
		}];
		keychaindaoTest.keychainDao.getPublicKeys(pubkeyIds, function(err, pubkeys) {
			ok(!err);
			deepEqual(pubkeys[0], keychaindaoTest.keypair.publicKey, "Fetch public key");

			start();
		});
	});

	asyncTest("Get User Keypair", 2, function() {
		keychaindaoTest.keychainDao.getReveiverPublicKey(keychaindaoTest.user, function(err, pubkey) {
			ok(!err);
			ok(pubkey && pubkey.publicKey);

			start();
		});
	});

});