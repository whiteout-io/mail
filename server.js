'use strict';

var express = require('express'),
	port, app, dev;

port = process.env.PORT || 8585;
dev = (process.argv[2] === '--dev');
app = express();

// Server setup
app.configure(function() {
	app.use(express.compress());

	if (dev) {
		// serve test files in development mode
		console.log(' > Starting in development mode ...');
		app.use(express['static'](__dirname + '/test'));

	} else {
		// activate content security policy for production
		app.use(function(req, res, next) {
			res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");
			res.set('X-Content-Security-Policy', "default-src *; script-src 'self' 'unsafe-eval'; options eval-script; object-src 'none'; style-src 'self' 'unsafe-inline'");
			res.set('X-WebKit-CSP', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");

			return next();
		});
	}

	app.use(express['static'](__dirname + '/src'));
});

// start server
app.listen(port);
console.log(' > listening on http://localhost:' + port);