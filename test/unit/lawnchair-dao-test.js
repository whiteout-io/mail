module("Lawnchair DAO");

var lawnchairdao_test = {};

asyncTest("Init", 2, function() {
	// init dependencies
	lawnchairdao_test.jsonDao = new app.dao.LawnchairDAO(Lawnchair);
	ok(lawnchairdao_test.jsonDao, 'LanwchairDAO');

	// clear db before test
	lawnchairdao_test.jsonDao.clear(function() {
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
	lawnchairdao_test.jsonDao.persist(key, data, function() {

		// read
		lawnchairdao_test.jsonDao.read(key, function(read) {
			equal(data.name, read.name, 'Create, Read');

			// list all
			lawnchairdao_test.jsonDao.list('type', 0, null, function(list) {
				ok(list.length === 1, 'List');

				// update
				var newName = 'updatedName';
				read.name = newName;
				lawnchairdao_test.jsonDao.persist(key, read, function() {

					// read again
					lawnchairdao_test.jsonDao.read(key, function(updated) {
						equal(updated.name, newName, 'Update');

						// delete
						lawnchairdao_test.jsonDao.remove(key, function() {

							// should read empty
							lawnchairdao_test.jsonDao.read(key, function(lastRead) {
								equal(lastRead, null, 'Delete');

								start();
							});
						});

					});
				});
			});
		});
	});
});