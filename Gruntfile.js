module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			all: ['Gruntfile.js', 'src/js/**/*.js']
		},
		qunit: {
			all: {
				options: {
					urls: ['http://localhost:8580/unit/index.html']
				}
			}
		}
	});

	// Load the plugin(s)
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-qunit');

	// Default task(s).
	grunt.registerTask('test', ['jshint', 'qunit']);

};