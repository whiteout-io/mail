module("LocalStorage DAO");

test("CRUD object literal", 4, function() {
	var dao = new app.dao.LocalStorageDAO(window);
	
	// clear before test
	dao.clear();
	
	var key = 'type_asdf';
	var data = {
		name : 'testName',
		type : 'testType'
	};
	
	// create
	dao.persist(key, data);
	
	// read
	var read = dao.read(key);
	equal(data.name, read.name, 'Create, Read');
	
	// list all
	var list = dao.list('type');
	ok(list.length === 1, 'List');
	
	// update
	var newName = 'updatedName';
	read.name = newName;
	dao.persist(key, read);
	var updated = dao.read(key);
	equal(updated.name, newName, 'Update');
	
	// delete
	dao.remove(key);
	equal(dao.read(key), null, 'Delete');
});