define(['cryptoLib/util', 'js/app-config'], function(util) {
	'use strict';

	var self = {};

	self.getEmailCollection = function(size) {
		// create test data
		var i, mail, collection = [],
			bigAssString = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet,';

		for (i = 0; i < size; i++) {
			mail = {
				id: i + '',
				from: 'john@from.com',
				to: ['jack@to.com'],
				subject: 'Important stuff ' + i,
				sentDate: (1971 + i) + '-03-13 18:17:53',
				body: bigAssString
			};

			collection.push(mail);
		}

		return collection;
	};

	self.packageCollectionForEncryption = function(collection, keySize, ivSize) {
		// package json objects for batch encrytion
		var envelope, envelopes = [];

		collection.forEach(function(model) {
			envelope = {
				id: model.id,
				plaintext: model.toJSON(),
				key: util.random(keySize),
				iv: util.random(ivSize)
			};

			envelopes.push(envelope);
		});

		return envelopes;
	};

	self.generateBigString = function(iterations) {
		var testMessage = '';
		// generate test data
		for (var i = 0; i < iterations; i++) {
			testMessage += 'aslghaksfdhsakjzfgasjfdgsauk';
		}

		return testMessage;
	};

	return self;
});