module("PGP Crypto");

var pgp_test = {
	keyID: null,
	keySize: 1024
};

asyncTest("Init", 1, function() {
	// init dependencies
	pgp_test.util = new app.crypto.Util(window);
	pgp_test.crypto = new app.crypto.PGP(window, openpgp, util, null);
	pgp_test.crypto.setPassphrase('asdf');
	ok(pgp_test.crypto, 'PGP crypto');

	pgp_test.helperEncrDecr = function(crypto, keyId, plaintext) {
		if (!crypto.getPublicKey()) {
			crypto.readKeys(keyId);
		}

		console.log('plaintext size [bytes]: ' + plaintext.length);

		var startTime = (new Date).getTime();
		var ct = crypto.asymmetricEncrypt(plaintext);
		var diff = (new Date).getTime() - startTime;

		console.log('Time taken for encryption [ms]: ' + diff);
		ok(ct, "ciphertext: see console output for benchmark");
		console.log('ciphertext size [bytes]: ' + ct.length);

		var decrStart = (new Date).getTime();
		var pt = crypto.asymmetricDecrypt(ct);
		var decrDiff = (new Date).getTime() - decrStart;

		console.log('Time taken for decryption [ms]: ' + decrDiff);
		ok(pt, "decrypted: see console output for benchmark");
		equal(pt, plaintext, "Decrypted should be the same as the plaintext");
	};

	start();
});

asyncTest("Generate keypair, De/Encrypt", 7, function() {
	var startTime = (new Date).getTime();
	var keys = pgp_test.crypto.generateKeys(pgp_test.keySize);
	var diff = (new Date).getTime() - startTime;

	pgp_test.keyID = keys.privateKey.getKeyId();
	pgp_test.crypto.readKeys(pgp_test.keyID);

	console.log('Time taken for key generation [ms]: ' + diff + ' (' + pgp_test.keySize + ' bit RSA keypair)');
	ok(pgp_test.crypto.getPrivateKey());
	ok(pgp_test.crypto.getPrivateKey().indexOf('-----BEGIN PGP PRIVATE KEY BLOCK-----') === 0);
	ok(pgp_test.crypto.getPublicKey());
	ok(pgp_test.crypto.getPublicKey().indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') === 0);

	pgp_test.helperEncrDecr(pgp_test.crypto, pgp_test.keyID, '06a9214036b8a15b512e03d534120006');

	start();

	// pgp_test.crypto.exportKeys(function(url) {
	// 	ok(url, 'export url');
	// 	
	// 	$.get(url, function(data) {
	// 		ok(data.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----') !== -1, 'exportd public key');
	// 		ok(data.indexOf('-----END PGP PRIVATE KEY BLOCK-----') !== -1, 'export private key');
	// 		
	// 		start();
	// 	});
	// });
});