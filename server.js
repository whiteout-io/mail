'use strict';

var express = require('express'),
	port, app, dev;

port = process.env.PORT || 8585;
dev = (process.argv[2] === '--dev');
app = express();

// Server setup
app.configure(function() {
	if (dev) {
		// serve test files in development mode
		console.log(' > Starting in development mode ...');
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
console.log(' > listening on http://localhost:' + port);