/**
 * A simple server for serving static files using node.js
 */

var express = require('express'),
	fs = require('fs'),
	port, app, prot, dev;

// set port
if (process.argv[2]) {
	port = process.argv[2];
} else {
	port = 8585;
}

if (process.argv[3] === '--dev') {
	// development server
	dev = true;
	prot = 'http';
	app = express();
} else {
	// production server
	dev = false;
	prot = 'https';
	app = express({
		ca: fs.readFileSync('./ssl/sub.class1.server.ca.pem'),
		key: fs.readFileSync('./ssl/ssl.key'),
		cert: fs.readFileSync('./ssl/ssl.crt')
	});
}

// Server setup
app.configure(function() {
	// active content security policy for production
	if (!dev) {
		app.use(function(req, res, next) {
			var csp = "script-src 'self' 'unsafe-eval'; object-src 'none'; style-src 'self' 'unsafe-inline'";
			res.set('Content-Security-Policy', csp);
			res.set('X-Content-Security-Policy', csp);
			res.set('X-WebKit-CSP', csp);
			return next();
		});
	}

	if (dev) {
		app.use(express['static'](__dirname + '/test'));
	}

	app.use(express['static'](__dirname + '/src'));
});

// start server
app.listen(port);
console.log(' > listening on ' + prot + '://localhost:' + port);