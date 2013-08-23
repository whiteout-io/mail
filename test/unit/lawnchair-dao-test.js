define(['js/dao/lawnchair-dao'], function(jsonDao) {
	'use strict';

	module("Lawnchair DAO");

	var lawnchairdaoTest = {
		user: 'lawnchair@test.com'
	};

	asyncTest("Init", 2, function() {
		// init dependencies
		jsonDao.init(lawnchairdaoTest.user);
		ok(jsonDao, 'LanwchairDAO');

		// clear db before test
		jsonDao.clear(function() {
			ok(true, 'cleared db');

			start();
		});
	});

	asyncTest("CRUD object literal", 4, function() {

		var key = 'type_asdf';
		var data = {
			name: 'testName',
			type: 'testType'
		};

		// create
		jsonDao.persist(key, data, function() {

			// read
			jsonDao.read(key, function(read) {
				equal(data.name, read.name, 'Create, Read');

				// list all
				jsonDao.list('type', 0, null, function(list) {
					ok(list.length === 1, 'List');

					// update
					var newName = 'updatedName';
					read.name = newName;
					jsonDao.persist(key, read, function() {

						// read again
						jsonDao.read(key, function(updated) {
							equal(updated.name, newName, 'Update');

							// delete
							jsonDao.remove(key, function() {

								// should read empty
								jsonDao.read(key, function(lastRead) {
									equal(lastRead, undefined, 'Delete');

									start();
								});
							});

						});
					});
				});
			});
		});
	});

});