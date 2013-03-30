/**
 * A simple development server for serving static files using node.js
 *   Required packages: nodejs, npm
 *   1. npm install express
 *   2. node dev_server.js 8080
 *   3. browse to http://localhost:8080
 */

var express = require('express'),
	port, app;

// set port
if (process.argv[2]) {
	port = process.argv[2];
} else {
	port = 8080;
}

// Server setup
app = express();
app.configure(function(){	
    app.use(express['static'](__dirname));
	app.use(function(req, res, next) {
		res.set('Content-Security-Policy', "script-src 'self' 'unsafe-eval'; object-src 'none'; style-src 'self' 'unsafe-inline'");
		return next();
	});
    app.use(express['static'](__dirname + '/src'));
});

// start server
app.listen(port);
console.log(' > listening on http://localhost:' + port);