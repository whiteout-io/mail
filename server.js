'use strict';

var express = require('express'),
    compression = require('compression'),
    app = express();

//
// web server config
//

var port = process.env.PORT || 8585,
    oneDay = 86400000,
    development = process.argv[2] === '--dev';

// set HTTP headers
app.use(function(req, res, next) {
    // HSTS
    res.set('Strict-Transport-Security', 'max-age=16070400; includeSubDomains');
    // CSP
    res.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; connect-src *; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    return next();
});

// redirect all http traffic to https
app.use(function(req, res, next) {
    if ((!req.secure) && (req.get('X-Forwarded-Proto') !== 'https') && !development) {
        res.redirect('https://' + req.hostname + req.url);
    } else {
        next();
    }
});

// use gzip compression
app.use(compression());

// server static files
app.use(express.static(__dirname + '/dist', {
    maxAge: oneDay
}));

//
// start server
//

app.listen(port);
if (development) {
    console.log(' > starting in development mode');
}
console.log(' > listening on http://localhost:' + port + '\n');