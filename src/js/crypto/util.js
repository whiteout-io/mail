(function() {
	'use strict';

	/**
	 * Various utitity methods for crypto, encoding & decoding
	 */
	var Util = function(forge, uuid, crypt) {

		/**
		 * Generates a new RFC 4122 version 4 compliant random UUID
		 */
		this.UUID = function() {
			return uuid.v4();
		};

		/**
		 * Generates a cryptographically secure random base64-encoded key or IV
		 * @param keySize [Number] The size of the key in bits (e.g. 128, 256)
		 * @return [String] The base64 encoded key/IV
		 */
		this.random = function(keySize) {
			var keyBase64, keyBuf;

			if (typeof module !== 'undefined' && module.exports) {
				// node.js
				keyBuf = crypt.randomBytes(keySize / 8);
				keyBase64 = new Buffer(keyBuf).toString('base64');

			} else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
				// browser if secure rng exists
				keyBuf = new Uint8Array(keySize / 8);
				window.crypto.getRandomValues(keyBuf);
				keyBase64 = window.btoa(this.uint8Arr2BinStr(keyBuf));

			} else {
				// generate random bytes with fortuna algorithm from forge
				keyBase64 = window.btoa(forge.random.getBytesSync(keySize / 8));
			}

			return keyBase64;
		};

		/**
		 * Parse a date string with the following format "1900-01-31 18:17:53"
		 */
		this.parseDate = function(str) {
			var parts = str.match(/(\d+)/g);
			return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
		};

		/**
		 * Returns a string representation of a date in the format "1900-01-31 18:17:53"
		 */
		this.formatDate = function(date) {
			var year = "" + date.getFullYear();
			var month = "" + (date.getMonth() + 1);
			if (month.length === 1) {
				month = "0" + month;
			}
			var day = "" + date.getDate();
			if (day.length === 1) {
				day = "0" + day;
			}
			var hour = "" + date.getHours();
			if (hour.length === 1) {
				hour = "0" + hour;
			}
			var minute = "" + date.getMinutes();
			if (minute.length === 1) {
				minute = "0" + minute;
			}
			var second = "" + date.getSeconds();
			if (second.length === 1) {
				second = "0" + second;
			}
			return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
		};

		/**
		 * Converts a binary String (e.g. from the FileReader Api) to an ArrayBuffer
		 * @param str [String] a binary string with integer values (0..255) per character
		 * @return [ArrayBuffer]
		 */
		this.binStr2ArrBuf = function(str) {
			var b = new ArrayBuffer(str.length);
			var buf = new Uint8Array(b);

			for (var i = 0; i < b.byteLength; i++) {
				buf[i] = str.charCodeAt(i);
			}

			return b;
		};

		/**
		 * Creates a Blob from an ArrayBuffer using the BlobBuilder Api
		 * @param str [String] a binary string with integer values (0..255) per character
		 * @return [ArrayBuffer] either a data url or a filesystem url
		 */
		this.arrBuf2Blob = function(buf, mimeType) {
			var b = new Uint8Array(buf);
			var blob = new Blob([b], {
				type: mimeType
			});

			return blob;
		};

		/**
		 * Creates a binary String from a Blob using the FileReader Api
		 * @param blob [Blob/File] a blob containing the the binary data
		 * @return [String] a binary string with integer values (0..255) per character
		 */
		this.blob2BinStr = function(blob, callback) {
			var reader = new FileReader();

			reader.onload = function(event) {
				callback(event.target.result);
			};

			reader.readAsBinaryString(blob);
		};

		/**
		 * Converts an ArrayBuffer to a binary String. This is a slower alternative to
		 * conversion with arrBuf2Blob -> blob2BinStr, since these use native apis,
		 * but it can be used on browsers without the BlodBuilder Api
		 * @param buf [ArrayBuffer]
		 * @return [String] a binary string with integer values (0..255) per character
		 */
		this.arrBuf2BinStr = function(buf) {
			var b = new Uint8Array(buf);
			var str = '';

			for (var i = 0; i < b.length; i++) {
				str += String.fromCharCode(b[i]);
			}

			return str;
		};

		/**
		 * Converts a UInt8Array to a binary String.
		 * @param buf [UInt8Array]
		 * @return [String] a binary string with integer values (0..255) per character
		 */
		this.uint8Arr2BinStr = function(buf) {
			var str = '';

			for (var i = 0; i < buf.length; i++) {
				str += String.fromCharCode(buf[i]);
			}

			return str;
		};

		/**
		 * Converts a binary String (e.g. from the FileReader Api) to a UInt8Array
		 * @param str [String] a binary string with integer values (0..255) per character
		 * @return [UInt8Array]
		 */
		this.binStr2Uint8Arr = function(str) {
			var c, buf = new Uint8Array(str.length);

			for (var i = 0; i < buf.length; i++) {
				c = str.charCodeAt(i);
				buf[i] = (c & 0xff);
			}

			return buf;
		};

		/**
		 * Convert a str to base64 in a browser and in node.js
		 */
		this.str2Base64 = function(str) {
			if (typeof module !== 'undefined' && module.exports) {
				return new Buffer(str, 'binary').toString('base64');
			} else if (typeof window !== 'undefined' && window.btoa) {
				return window.btoa(str);
			} else {
				return forge.util.encode64(str);
			}
		};

		/**
		 * Convert a base64 encoded string in a browser and in node.js
		 */
		this.base642Str = function(str) {
			if (typeof module !== 'undefined' && module.exports) {
				return new Buffer(str, 'base64').toString('binary');
			} else if (typeof window !== 'undefined' && window.atob) {
				return window.atob(str);
			} else {
				return forge.util.decode64(str);
			}
		};

	};

	if (typeof define !== 'undefined' && define.amd) {
		// AMD
		define(['uuid', 'forge'], function(uuid, forge) {
			return new Util(forge, uuid, undefined);
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		// node.js
		module.exports = new Util(require('node-forge'), require('node-uuid'), require('crypto'));
	}

})();