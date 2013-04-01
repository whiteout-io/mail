(function() {
	'use strict';

	/**
	 * A Wrapper for Crypto.js's PBKDF2 function
	 */
	app.crypto.PBKDF2 = function() {

		/**
		 * PBKDF2-HMAC-SHA1 key derivation with a constant salt and 1000 iterations
		 * @param password [String] The password in UTF8
		 * @param keySize [Number] The key size in bits
		 * @return [String] The base64 encoded key
		 */
		this.getKey = function(password, keySize) {
			var salt = CryptoJS.enc.Base64.parse("vbhmLjC+Ub6MSbhS6/CkOwxB25wvwRkSLP2DzDtYb+4="); // from random 256 bit value
			var key = CryptoJS.PBKDF2(password, salt, {
				keySize: keySize / 32,
				iterations: 1000
			});
			var keyBase64 = CryptoJS.enc.Base64.stringify(key);

			return keyBase64;
		};

	};

}());