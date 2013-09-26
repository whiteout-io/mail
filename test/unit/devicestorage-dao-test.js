define(['underscore', 'cryptoLib/util', 'js/crypto/crypto', 'js/dao/devicestorage-dao', 'test/test-data'], function(_, util, Crypto, DeviceStorageDAO, testData) {
    'use strict';

    module("DeviceStorage");

    var devicestorageTest = {
        user: 'devicestorage_test@example.com',
        password: 'Password',
        keySize: 128,
        ivSize: 128,
        rsaKeySize: 1024
    };

    var crypto, storage;

    asyncTest("Init", 3, function() {
        // init dependencies
        storage = new DeviceStorageDAO();
        storage.init(devicestorageTest.user, function() {
            ok(storage, 'DeviceStorageDAO');

            // generate test data
            devicestorageTest.list = testData.getEmailCollection(100);

            // init crypto
            crypto = new Crypto();
            crypto.init({
                emailAddress: devicestorageTest.user,
                password: devicestorageTest.password,
                keySize: devicestorageTest.keySize,
                rsaKeySize: devicestorageTest.rsaKeySize
            }, function(err, generatedKeypair) {
                ok(!err && generatedKeypair, 'Init crypto');
                devicestorageTest.generatedKeypair = generatedKeypair;

                // clear db before tests
                storage.clear(function(err) {
                    ok(!err, 'DB cleared. Error status: ' + err);

                    start();
                });

            });
        });
    });

    asyncTest("Encrypt list for user", 2, function() {
        var receiverPubkeys = [devicestorageTest.generatedKeypair.publicKey];

        crypto.encryptListForUser(devicestorageTest.list, receiverPubkeys, function(err, encryptedList) {
            ok(!err);
            equal(encryptedList.length, devicestorageTest.list.length, 'Encrypt list');

            encryptedList.forEach(function(i) {
                i.sentDate = _.findWhere(devicestorageTest.list, {
                    id: i.id
                }).sentDate;
            });

            devicestorageTest.encryptedList = encryptedList;
            start();
        });
    });

    asyncTest("Store encrypted list", 1, function() {
        storage.storeEcryptedList(devicestorageTest.encryptedList, 'email_inbox', function() {
            ok(true, 'Store encrypted list');

            start();
        });
    });

    asyncTest("List items", 4, function() {

        var senderPubkeys = [devicestorageTest.generatedKeypair.publicKey];

        var offset = 2,
            num = 6;

        // list encrypted items from storage
        storage.listEncryptedItems('email_inbox', offset, num, function(err, encryptedList) {
            ok(!err);

            // decrypt list
            crypto.decryptListForUser(encryptedList, senderPubkeys, function(err, decryptedList) {
                ok(!err);
                equal(decryptedList.length, num, 'Found ' + decryptedList.length + ' items in store (and decrypted)');

                var origSet = devicestorageTest.list.splice(92, num);
                deepEqual(decryptedList, origSet, 'Messages decrypted correctly');

                start();
            });
        });
    });

});