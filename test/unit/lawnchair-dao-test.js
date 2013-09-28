define(['js/dao/lawnchair-dao'], function(jsonDao) {
	'use strict';

	module("Lawnchair DAO");

	var lawnchairdaoTest = {
		user: 'lawnchair@test.com'
	};

	asyncTest("Init", 2, function() {
		// init dependencies
		jsonDao.init(lawnchairdaoTest.user, function() {
			ok(true, 'init db');

			// clear db before test
			jsonDao.clear(function() {
				ok(true, 'cleared db');

				start();
			});
		});
	});

	asyncTest("CRUD object literal", 5, function() {

		var key = 'type_1';
		var data = {
			name: 'testName1',
			type: 'testType1'
		};

		var key2 = 'type_2';
		var data2 = {
			name: 'testName2',
			type: 'testType2'
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

							// persist 2nd type
							jsonDao.persist(key2, data2, function() {

								// delete all items of 2nd type
								jsonDao.removeList(key2, function() {

									jsonDao.list('type', 0, null, function(newList) {
										ok(newList.length === 1, 'List');

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
		});
	});

});