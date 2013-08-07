'use strict';

var browserify = require('browserify'),
    fs = require('fs'),
    path = require('path');

var b = browserify('./imap-client.js');
b.require('net-chromeify', {
    expose: 'net'
});
b.require('tls-chromeify', {
    expose: 'tls'
});

b.bundle(function(err, src) {
    if (err) {
        throw err;
    }

    var file = path.join(__dirname + '/foo.js');
    fs.writeFileSync(file, src);

    console.log('bundle written to: ' + file);
});