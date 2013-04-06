/**
 * A simple server for serving static files using node.js
 */

var express = require('express'),
	fs = require('fs'),
	port, app, prot, dev;

port = (process.argv[2]) ? process.argv[2] : 8585;
dev = (process.argv[3] === '--dev');

if (dev) {
	// development server
	console.log(' > Starting in development mode ...');
	prot = 'http';
	app = express();
} else {
	// production server
	prot = 'https';
	app = express({
		ca: fs.readFileSync('./ssl/sub.class1.server.ca.pem'),
		key: fs.readFileSync('./ssl/ssl.key'),
		cert: fs.readFileSync('./ssl/ssl.crt')
	});
}

// Server setup
app.configure(function() {
	if (dev) {
		// serve test files in development mode
		app.use(express['static'](__dirname + '/test'));

	} else {
		// activate content security policy for production
		app.use(function(req, res, next) {
			var csp = "script-src 'self' 'unsafe-eval'; object-src 'none'; style-src 'self' 'unsafe-inline'";
			res.set('Content-Security-Policy', csp);
			res.set('X-Content-Security-Policy', csp);
			res.set('X-WebKit-CSP', csp);
			return next();
		});
	}

	app.use(express['static'](__dirname + '/src'));
});

// start server
app.listen(port);
console.log(' > listening on ' + prot + '://localhost:' + port);