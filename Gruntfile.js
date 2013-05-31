module.exports = function(grunt) {
	'use strict';

	// Project configuration.
	grunt.initConfig({
		connect: {
			dev: {
				options: {
					port: 8580,
					base: '.',
					keepalive: true
				}
			},
			test: {
				options: {
					port: 8581,
					base: '.'
				}
			},
			prod: {
				options: {
					port: process.env.PORT || 8585,
					base: './src/',
					keepalive: true,
					middleware: function(connect, options) {
						// Return array of whatever middlewares you want
						return [

						function(req, res, next) {
							res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");
							res.setHeader('X-Content-Security-Policy', "default-src *; script-src 'self' 'unsafe-eval'; options eval-script; object-src 'none'; style-src 'self' 'unsafe-inline'");
							res.setHeader('X-WebKit-CSP', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");

							return next();
						},

						// Serve static files.
						connect.static(options.base)];
					}
				}
			}
		},

		jshint: {
			all: ['Gruntfile.js', 'src/js/**/*.js']
		},

		qunit: {
			all: {
				options: {
					urls: [
						'http://localhost:<%= connect.test.options.port %>/test/unit/index.html',
						'http://localhost:<%= connect.test.options.port %>/test/integration/index.html']
				}
			}
		}
	});

	// Load the plugin(s)
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');

	// Default task(s).
	grunt.registerTask('dev', ['connect:dev']);
	grunt.registerTask('test', ['jshint', 'connect:test', 'qunit']);
	grunt.registerTask('prod', ['connect:prod']);

};